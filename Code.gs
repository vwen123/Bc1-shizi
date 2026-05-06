// ════════════════════════════════════════════════════════════════
//  小状元识字朗读 — Google Apps Script 后端
//  部署步骤：
//  1. 前往 script.google.com，建立新专案，贴入此代码
//  2. 点击「部署」→「新增部署」→ 类型选「网页应用程式」
//  3. 执行身份：我（Me）
//     谁可以存取：任何人（Anyone）
//  4. 点击「部署」，复制 Web App URL
//  5. 把 URL 贴入 index.html 的 GAS_URL 变量
// ════════════════════════════════════════════════════════════════

// ── 取得或建立 Google Spreadsheet ────────────────────────────
function getSpreadsheet() {
    const name  = '小状元识字朗读_数据';
    const files = DriveApp.getFilesByName(name);
    if (files.hasNext()) return SpreadsheetApp.open(files.next());

    // 第一次执行时自动建立
    const ss = SpreadsheetApp.create(name);
    ss.insertSheet('Lessons');
    ss.insertSheet('Attempts');
    // 删除预设的 Sheet1
    const def = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    if (ss.getSheets().length > 2) ss.deleteSheet(def);
    return ss;
}

function getSheet(name) {
    const ss    = getSpreadsheet();
    return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── HTTP 路由 ─────────────────────────────────────────────────
function doGet(e) {
    try {
        const action = e.parameter.action;
        if (action === 'getLessons')   return ok(getLessons());
        if (action === 'getLesson')    return ok(getLesson(e.parameter.lessonId));
        if (action === 'getAnalytics') return ok(getAnalytics(e.parameter.lessonId));
        return err('Unknown action: ' + action);
    } catch(ex) {
        return err(ex.message);
    }
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        if (data.action === 'createLesson') return ok(createLesson(data));
        if (data.action === 'saveAttempt')  return ok(saveAttempt(data));
        return err('Unknown action: ' + data.action);
    } catch(ex) {
        return err(ex.message);
    }
}

function ok(data) {
    return ContentService
        .createTextOutput(JSON.stringify({ ok: true, ...data }))
        .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
    return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: msg }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ── 课程 ─────────────────────────────────────────────────────
function createLesson(data) {
    const sheet    = getSheet('Lessons');
    const lessonId = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    sheet.appendRow([
        lessonId,
        data.inputText,
        JSON.stringify(data.words),
        JSON.stringify(data.paragraphs),
        new Date().toISOString()
    ]);
    return { lessonId };
}

function getLesson(lessonId) {
    const rows = getSheet('Lessons').getDataRange().getValues();
    const row  = rows.find(r => r[0] === lessonId);
    if (!row) throw new Error('课程不存在');
    return {
        lessonId:   row[0],
        inputText:  row[1],
        words:      JSON.parse(row[2] || '[]'),
        paragraphs: JSON.parse(row[3] || '[]'),
        createdAt:  row[4]
    };
}

function getLessons() {
    const lessonRows  = getSheet('Lessons').getDataRange().getValues();
    const attemptRows = getSheet('Attempts').getDataRange().getValues();

    const lessons = lessonRows
        .filter(r => r[0]) // 跳过空行
        .map(r => {
            let words = [], paras = [];
            try { words = JSON.parse(r[2]); } catch(e) {}
            try { paras = JSON.parse(r[3]); } catch(e) {}
            const id       = r[0];
            const attempts = attemptRows.filter(a => a[1] === id);
            return {
                lessonId:       id,
                inputText:      r[1],
                wordsPreview:   words.map(w => w.word).join('、'),
                paragraphCount: paras.length,
                attemptCount:   attempts.length,
                completedCount: attempts.filter(a => a[7]).length,
                createdAt:      r[4]
            };
        })
        .reverse(); // 最新在前

    return { lessons };
}

// ── 学生成绩 ──────────────────────────────────────────────────
function saveAttempt(data) {
    const sheet = getSheet('Attempts');

    // 若有 attemptId 则更新现有行
    if (data.attemptId) {
        const rows = sheet.getDataRange().getValues();
        const idx  = rows.findIndex(r => r[0] === data.attemptId);
        if (idx >= 0) {
            const rowNum = idx + 1;
            sheet.getRange(rowNum, 4).setValue(JSON.stringify(data.wordScores || {}));
            sheet.getRange(rowNum, 5).setValue(JSON.stringify(data.paraScores || {}));
            sheet.getRange(rowNum, 6).setValue(data.totalScore || 0);
            if (data.completedAt) sheet.getRange(rowNum, 8).setValue(data.completedAt);
            return { attemptId: data.attemptId };
        }
    }

    // 新建一行
    const attemptId = 'A' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    sheet.appendRow([
        attemptId,
        data.lessonId,
        data.studentName,
        JSON.stringify(data.wordScores || {}),
        JSON.stringify(data.paraScores || {}),
        data.totalScore || 0,
        new Date().toISOString(),
        data.completedAt || ''
    ]);
    return { attemptId };
}

// ── 数据分析 ──────────────────────────────────────────────────
function getAnalytics(lessonId) {
    const lesson      = getLesson(lessonId);
    const attemptRows = getSheet('Attempts').getDataRange().getValues();

    const attempts = attemptRows
        .filter(r => r[1] === lessonId)
        .map(r => ({
            attemptId:   r[0],
            studentName: r[2],
            wordScores:  JSON.parse(r[3] || '{}'),
            paraScores:  JSON.parse(r[4] || '{}'),
            totalScore:  r[5],
            startedAt:   r[6],
            completedAt: r[7]
        }))
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    return { lesson, attempts };
}
