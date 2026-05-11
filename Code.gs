// 小状元识字 — Google Sheets 成绩记录
// ════════════════════════════════════════
// 设置步骤（只需做一次）：
//   1. 新建一份 Google Sheets
//   2. 扩展功能 → Apps Script → 将此档案内容全部取代贴入
//   3. 储存 → 部署 → 新增部署
//      类型：网络应用程式 / 执行身份：我 / 存取权限：任何人
//   4. 授权后复制 Web App URL 贴入 index.html 的 GAS_URL
// ════════════════════════════════════════

// 栏位：提交时间 | 学校 | 姓名 | 单元 | 课题 | 总分 | 第一关(认词) | 第二关(朗读) | 游戏闯关
var HEADERS = ['提交时间','学校','姓名','单元','课题','总分','第一关(认词)','第二关(朗读)','游戏闯关'];

function doPost(e) {
  try {
    var data  = JSON.parse(e.postData.contents);
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('成绩记录');

    if (!sheet) {
      sheet = ss.insertSheet('成绩记录');
      sheet.appendRow(HEADERS);
      var hRange = sheet.getRange(1, 1, 1, HEADERS.length);
      hRange.setFontWeight('bold')
            .setBackground('#4285f4')
            .setFontColor('#ffffff')
            .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 155);
      sheet.setColumnWidths(2, HEADERS.length - 1, 100);
      sheet.setColumnWidth(4, 155);
      sheet.setColumnWidth(5, 130);
    }

    sheet.appendRow([
      data.submittedAt  || new Date().toLocaleString('zh-CN'),
      data.school       || '未填',
      data.studentName  || '',
      data.unit         || '',
      data.lessonTitle  || '',
      data.totalScore   || 0,
      data.wordTotal    !== undefined ? data.wordTotal : '',
      data.paraTotal    !== undefined ? data.paraTotal : '',
      data.gameTotal    !== undefined ? data.gameTotal : ''
    ]);

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
        totalScore:  330,
        submittedAt: new Date().toLocaleString('zh-CN'),
        wordTotal:   330,
        paraTotal:   158,
        gameTotal:   75
      })
    }
  });
  Logger.log('✅ 测试写入完成，请检查「成绩记录」工作表');
}
