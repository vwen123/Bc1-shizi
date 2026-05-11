// 小状元识字 — Google Sheets 成绩记录
// ════════════════════════════════════════
// 设置步骤（只需做一次）：
//   1. 新建一份 Google Sheets
//   2. 扩展功能 → Apps Script → 将此档案内容全部取代贴入
//   3. 储存 → 部署 → 新增部署
//      类型：网络应用程式
//      执行身份：我
//      存取权限：任何人
//   4. 授权后复制 Web App URL
//   5. 贴入 index.html 的 GAS_URL 常数
// ════════════════════════════════════════

// 栏位结构（共 15 栏）：
// 提交时间 | 学校 | 姓名 | 单元 | 课题 | 总分
// | 词语1 | 词语2 | 词语3 | 词语4
// | 段落1 | 段落2 | 段落3
// | 看图游戏 | 配对游戏

var HEADERS = [
  '提交时间', '学校', '姓名', '单元', '课题', '总分',
  '词语1', '词语2', '词语3', '词语4',
  '段落1', '段落2', '段落3',
  '看图游戏', '配对游戏'
];

function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var sheet  = ss.getSheetByName('成绩记录');
    var scores = data.scores || {};
    var words  = data.words  || [];   // ['上学','花儿','太阳','校门']

    // 首次建立工作表 + 标题行
    if (!sheet) {
      sheet = ss.insertSheet('成绩记录');
      sheet.appendRow(HEADERS);
      var hRange = sheet.getRange(1, 1, 1, HEADERS.length);
      hRange.setFontWeight('bold')
            .setBackground('#4285f4')
            .setFontColor('#ffffff')
            .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidths(2, HEADERS.length - 1, 90);
      sheet.setColumnWidth(4, 160);
      sheet.setColumnWidth(5, 140);
    }

    // 如果传来了词语名称，更新标题行第7-10栏
    if (words.length > 0) {
      for (var wi = 0; wi < Math.min(words.length, 4); wi++) {
        sheet.getRange(1, 7 + wi).setValue('词语' + (wi + 1) + '\n(' + words[wi] + ')');
      }
    }

    // 词语得分（word-0 ~ word-3，不含笔顺）
    var wordScores = [];
    for (var i = 0; i < 4; i++) {
      wordScores.push(scores['word-' + i] !== undefined ? scores['word-' + i] : '');
    }

    // 段落得分（para-0 ~ para-2）
    var paraScores = [];
    for (var j = 0; j < 3; j++) {
      paraScores.push(scores['para-' + j] !== undefined ? scores['para-' + j] : '');
    }

    sheet.appendRow([
      data.submittedAt || new Date().toLocaleString('zh-CN'),
      data.school      || '未填',
      data.studentName || '',
      data.unit        || '',
      data.lessonTitle || '',
      data.totalScore  || 0
    ].concat(wordScores, paraScores, [
      scores['game-img']  !== undefined ? scores['game-img']  : '',
      scores['game-pair'] !== undefined ? scores['game-pair'] : ''
    ]));

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 在 Apps Script 编辑器执行此函数来测试
function testWrite() {
  doPost({
    postData: {
      contents: JSON.stringify({
        school:      'YANI',
        studentName: '小明',
        unit:        '第一单元·新的开始',
        lessonTitle: '一、上学了',
        totalScore:  340,
        submittedAt: new Date().toLocaleString('zh-CN'),
        words:       ['上学', '花儿', '太阳', '校门'],
        scores: {
          'word-0': 85, 'word-1': 90, 'word-2': 75, 'word-3': 80,
          'para-0': 70, 'para-1': 88,
          'game-img': 75, 'game-pair': 77
        }
      })
    }
  });
  Logger.log('✅ 测试写入完成，请检查 Google Sheets「成绩记录」工作表');
}
