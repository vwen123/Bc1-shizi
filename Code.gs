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
//   5. 贴入 index.html 第一行的 GAS_URL = '...'
// ════════════════════════════════════════

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName('成绩记录');

    // 首次写入时自动建立工作表和标题行
    if (!sheet) {
      sheet = ss.insertSheet('成绩记录');
      const headers = ['提交时间', '学校', '姓名', '单元', '课题', '总分'];
      sheet.appendRow(headers);
      const hRange = sheet.getRange(1, 1, 1, headers.length);
      hRange.setFontWeight('bold')
            .setBackground('#4285f4')
            .setFontColor('#ffffff')
            .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
      sheet.setColumnWidths(1, 6, 130);
      sheet.setColumnWidth(1, 160);
    }

    sheet.appendRow([
      data.submittedAt  || new Date().toLocaleString('zh-CN'),
      data.school       || '未填',
      data.studentName  || '',
      data.unit         || '',
      data.lessonTitle  || '',
      data.totalScore   || 0
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

// 在 Apps Script 编辑器直接点击执行此函数来测试是否正常
function testWrite() {
  doPost({
    postData: {
      contents: JSON.stringify({
        school:      'YANI',
        studentName: '小明',
        unit:        '第一单元·新的开始',
        lessonTitle: '一、上学了',
        totalScore:  85,
        submittedAt: new Date().toLocaleString('zh-CN')
      })
    }
  });
  Logger.log('✅ 测试写入完成，请检查 Google Sheets「成绩记录」工作表');
}
