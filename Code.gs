// ════════════════════════════════════════════════════════════════
//  小状元识字朗读 — GAS 后端（完整版）
//
//  Script Properties 需设置：
//    GEMINI_KEY = 你的 Gemini API Key
//
//  部署：类型「网页应用程式」，执行身份「我」，存取「任何人」
// ════════════════════════════════════════════════════════════════

const DRIVE_FOLDER = '小状元识字_图片库';

function geminiKey() {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
}

// ── Spreadsheet ───────────────────────────────────────────────
function getSpreadsheet() {
    const name  = '小状元识字朗读_数据';
    const files = DriveApp.getFilesByName(name);
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
    const ss = SpreadsheetApp.create(name);
    ['Lessons', 'Attempts'].forEach(n => ss.insertSheet(n));
    try { ss.deleteSheet(ss.getSheetByName('Sheet1')); } catch(e) {}
    return ss;
}
function getSheet(name) {
    const ss = getSpreadsheet();
    return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── HTTP Router ───────────────────────────────────────────────
function doGet(e) {
    try {
        const a = e.parameter.action;
        if (a === 'getLessons')   return ok(getLessons());
        if (a === 'getLesson')    return ok(getLesson(e.parameter.lessonId));
        if (a === 'getAnalytics') return ok(getAnalytics(e.parameter.lessonId));
        return err('Unknown GET action: ' + a);
    } catch(ex) { return err(ex.message); }
}

function doPost(e) {
    try {
        const d = JSON.parse(e.postData.contents);
        if (d.action === 'createLesson')      return ok(createLesson(d));
        if (d.action === 'updateLesson')      return ok(updateLesson(d));
        if (d.action === 'deleteLesson')      return ok(deleteLesson(d));
        if (d.action === 'generateOneImage')  return ok(generateOneImage(d));
        if (d.action === 'saveAttempt')       return ok(saveAttempt(d));
        return err('Unknown POST action: ' + d.action);
    } catch(ex) { return err(ex.message); }
}

function ok(d)  { return ContentService.createTextOutput(JSON.stringify({ ok:true,  ...d })).setMimeType(ContentService.MimeType.JSON); }
function err(m) { return ContentService.createTextOutput(JSON.stringify({ ok:false, error:m })).setMimeType(ContentService.MimeType.JSON); }

// ════════════════════════════════════════════════════════════════
//  课程 CRUD
// ════════════════════════════════════════════════════════════════
function createLesson(d) {
    const sheet    = getSheet('Lessons');
    const lessonId = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    sheet.appendRow([
        lessonId,
        d.unit    || '',
        d.title   || '',
        d.content || '',
        JSON.stringify(d.words || []),  // [{word,pinyin,emoji,imgPrompt,imgUrl}]
        new Date().toISOString(),
        'draft'   // status: draft | published
    ]);
    return { lessonId };
}

function updateLesson(d) {
    const sheet = getSheet('Lessons');
    const rows  = sheet.getDataRange().getValues();
    const idx   = rows.findIndex(r => r[0] === d.lessonId);
    if (idx < 0) throw new Error('课程不存在');
    const n = idx + 1;
    if (d.unit    !== undefined) sheet.getRange(n, 2).setValue(d.unit);
    if (d.title   !== undefined) sheet.getRange(n, 3).setValue(d.title);
    if (d.content !== undefined) sheet.getRange(n, 4).setValue(d.content);
    if (d.words   !== undefined) sheet.getRange(n, 5).setValue(JSON.stringify(d.words));
    if (d.status  !== undefined) sheet.getRange(n, 7).setValue(d.status);
    return { lessonId: d.lessonId };
}

function deleteLesson(d) {
    const sheet = getSheet('Lessons');
    const rows  = sheet.getDataRange().getValues();
    const idx   = rows.findIndex(r => r[0] === d.lessonId);
    if (idx < 0) throw new Error('课程不存在');
    sheet.deleteRow(idx + 1);
    return { deleted: true };
}

function getLessons() {
    const lRows = getSheet('Lessons').getDataRange().getValues();
    const aRows = getSheet('Attempts').getDataRange().getValues();
    const lessons = lRows.filter(r => r[0]).map(r => {
        let words = [];
        try { words = JSON.parse(r[4]); } catch(e) {}
        const atts = aRows.filter(a => a[1] === r[0]);
        return {
            lessonId:       r[0],
            unit:           r[1],
            title:          r[2],
            content:        r[3],
            words,
            createdAt:      r[5],
            status:         r[6] || 'draft',
            imagesReady:    words.filter(w => w.imgUrl).length,
            totalWords:     words.length,
            attemptCount:   atts.length,
            completedCount: atts.filter(a => a[8]).length
        };
    }).reverse();
    return { lessons };
}

function getLesson(lessonId) {
    const rows = getSheet('Lessons').getDataRange().getValues();
    const row  = rows.find(r => r[0] === lessonId);
    if (!row) throw new Error('课程不存在');
    return {
        lessonId: row[0], unit: row[1], title: row[2], content: row[3],
        words:    JSON.parse(row[4] || '[]'),
        createdAt: row[5], status: row[6]
    };
}

// ════════════════════════════════════════════════════════════════
//  图片生成（Gemini Imagen → Google Drive）
// ════════════════════════════════════════════════════════════════
function generateOneImage(d) {
    const { lessonId, wordIndex } = d;
    const lesson = getLesson(lessonId);
    const words  = [...lesson.words];
    const w      = words[wordIndex];
    if (!w) throw new Error('词语不存在，索引：' + wordIndex);

    const imgUrl = callImagenAndSave(lessonId, w);
    words[wordIndex] = { ...w, imgUrl };
    updateLesson({ lessonId, words });

    // 检查是否全部完成，自动发布
    if (words.every(wx => wx.imgUrl)) {
        updateLesson({ lessonId, status: 'published' });
    }
    return { imgUrl, wordIndex, word: w.word };
}

function callImagenAndSave(lessonId, wordObj) {
    const key    = geminiKey();
    if (!key) throw new Error('请在 Script Properties 中设置 GEMINI_KEY');

    const prompt = 'Cute simple cartoon illustration for Chinese primary school children, colorful, white background, child-friendly flat design: '
                 + (wordObj.imgPrompt || wordObj.word);

    const res  = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=' + key,
        {
            method:      'post',
            contentType: 'application/json',
            payload:     JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
            muteHttpExceptions: true
        }
    );
    const data = JSON.parse(res.getContentText());
    const b64  = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('Imagen 未返回图片：' + res.getContentText().slice(0, 200));

    return saveToDrive(b64, lessonId + '_' + wordObj.word + '.png');
}

function saveToDrive(base64, filename) {
    const bytes = Utilities.base64Decode(base64);
    const blob  = Utilities.newBlob(bytes, 'image/png', filename);

    // 取得或建立资料夹
    let folder;
    const iter = DriveApp.getFoldersByName(DRIVE_FOLDER);
    if (iter.hasNext()) {
        folder = iter.next();
    } else {
        folder = DriveApp.createFolder(DRIVE_FOLDER);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // 删除同名旧档
    const old = folder.getFilesByName(filename);
    while (old.hasNext()) old.next().setTrashed(true);

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

// ════════════════════════════════════════════════════════════════
//  学生成绩
// ════════════════════════════════════════════════════════════════
function saveAttempt(d) {
    const sheet = getSheet('Attempts');

    if (d.attemptId) {
        const rows = sheet.getDataRange().getValues();
        const idx  = rows.findIndex(r => r[0] === d.attemptId);
        if (idx >= 0) {
            const n = idx + 1;
            if (d.scores      !== undefined) sheet.getRange(n, 5).setValue(JSON.stringify(d.scores));
            if (d.totalScore  !== undefined) sheet.getRange(n, 6).setValue(d.totalScore);
            if (d.completedAt !== undefined) sheet.getRange(n, 9).setValue(d.completedAt);
            return { attemptId: d.attemptId };
        }
    }

    const attemptId = 'A' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    sheet.appendRow([
        attemptId,          // A
        d.lessonId,         // B
        d.studentName,      // C
        new Date().toISOString(), // D startedAt
        JSON.stringify(d.scores || {}), // E scores per item
        d.totalScore || 0,  // F
        d.lessonTitle || '', // G
        d.unit || '',        // H
        d.completedAt || ''  // I
    ]);
    return { attemptId };
}

function getAnalytics(lessonId) {
    const lesson = getLesson(lessonId);
    const rows   = getSheet('Attempts').getDataRange().getValues();
    const attempts = rows
        .filter(r => r[1] === lessonId)
        .map(r => ({
            attemptId:   r[0],
            studentName: r[2],
            startedAt:   r[3],
            scores:      JSON.parse(r[4] || '{}'),
            totalScore:  r[5],
            completedAt: r[8]
        }))
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return { lesson, attempts };
}
