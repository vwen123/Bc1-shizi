// ════════════════════════════════════════════════════════════════
//  小状元识字朗读 — Google Apps Script 后端
//
//  部署步骤：
//  1. 前往 script.google.com，建立新专案，贴入此代码
//  2. 左边选「专案设定」→「Script Properties」→ 新增两个属性：
//       GEMINI_KEY  = AIzaSyAwrUxZsrhNWiz3PbtTD7w4TkZQf-w8gTw
//       OPENAI_KEY  = sk-proj-v7dqXPD...（你的 OpenAI key）
//  3. 点「部署」→「新增部署」→ 类型选「网页应用程式」
//       执行身份：我（Me）
//       谁可以存取：任何人（Anyone）
//  4. 复制 Web App URL，贴入 index.html 的 GAS_URL
// ════════════════════════════════════════════════════════════════

// ── 从 Script Properties 取得密钥（不写在代码里）──────────────
function getKeys() {
    const p = PropertiesService.getScriptProperties();
    return {
        gemini: p.getProperty('GEMINI_KEY'),
        openai: p.getProperty('OPENAI_KEY')
    };
}

// ── Spreadsheet ───────────────────────────────────────────────
function getSpreadsheet() {
    const name  = '小状元识字朗读_数据';
    const files = DriveApp.getFilesByName(name);
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
    const ss = SpreadsheetApp.create(name);
    ss.insertSheet('Lessons');
    ss.insertSheet('Attempts');
    const def = ss.getSheetByName('Sheet1');
    if (def) ss.deleteSheet(def);
    return ss;
}

function getSheet(name) {
    const ss = getSpreadsheet();
    return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── HTTP 路由 ─────────────────────────────────────────────────
function doGet(e) {
    try {
        const action = e.parameter.action;
        if (action === 'getLessons')    return ok(getLessons());
        if (action === 'getLesson')     return ok(getLesson(e.parameter.lessonId));
        if (action === 'getAnalytics')  return ok(getAnalytics(e.parameter.lessonId));
        return err('Unknown GET action: ' + action);
    } catch(ex) { return err(ex.message); }
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        // ── 数据存储 ──
        if (data.action === 'createLesson')    return ok(createLesson(data));
        if (data.action === 'saveAttempt')     return ok(saveAttempt(data));
        // ── AI 代理 ──
        if (data.action === 'processLesson')   return ok(processLesson(data));
        if (data.action === 'evaluateReading') return ok(evaluateReading(data));
        if (data.action === 'generateImage')   return ok(generateImage(data));
        if (data.action === 'tts')             return ok(tts(data));
        return err('Unknown POST action: ' + data.action);
    } catch(ex) { return err(ex.message); }
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

// ════════════════════════════════════════════════════════════════
//  AI 代理函数
// ════════════════════════════════════════════════════════════════

// ── 课文分析（Gemini）────────────────────────────────────────
function processLesson(data) {
    const key    = getKeys().gemini;
    const prompt = `你是一位经验丰富的小学华文老师，专门教一年级学生。请分析以下课文，完成两件事：
1. 提取 3-4 个最重要的生字或生词（优先选单个汉字，选学生最可能不认识的）
2. 将课文按自然段或意群分成 2-4 个段落

课文内容：
${data.text}

请严格按以下 JSON 格式返回（不要加 markdown 代码块）：
{
  "words": [
    {
      "word": "字或词",
      "pinyin": "pīn yīn（带声调符号）",
      "explanation": "中文解释，10字以内",
      "imagePrompt": "English prompt for a simple child cartoon illustration",
      "bushou": "部首（单个汉字）",
      "bushouMeaning": "部首含义，10字以内，如三点水表示水",
      "peici": ["配词1", "配词2", "配词3"],
      "koujue": "记字口诀，20字以内，押韵或联想，生动有趣",
      "duoyinzi": null
    }
  ],
  "paragraphs": ["第一段", "第二段"]
}

重要：duoyinzi 若是多音字填数组如 [{"pinyin":"háng","meaning":"行业","example":"银行"}]，否则填 null`;

    const res = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`,
        {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }),
            muteHttpExceptions: true
        }
    );
    const result = JSON.parse(res.getContentText());
    if (!result.candidates) throw new Error('Gemini error: ' + JSON.stringify(result));
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

// ── 朗读评分（Gemini 多模态）─────────────────────────────────
function evaluateReading(data) {
    const key = getKeys().gemini;
    const prompt = `你是一位温柔耐心的一年级语文老师，正在评估学生朗读「${data.target}」的表现。
评分标准：发音准确度（50%）、流畅度（30%）、声音清晰度（20%）。
如果录音中听不到任何声音或内容完全错误，给1星。
请用温暖鼓励的语气给出一句15字内的反馈。
严格返回 JSON：{"stars": 整数(1-5), "feedback": "鼓励语"}`;

    const res = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`,
        {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: data.mime, data: data.b64 } }
                    ]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            }),
            muteHttpExceptions: true
        }
    );
    const result = JSON.parse(res.getContentText());
    if (!result.candidates) throw new Error('Gemini eval error: ' + JSON.stringify(result));
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

// ── 生词插图（DALL-E 3）──────────────────────────────────────
function generateImage(data) {
    const key = getKeys().openai;
    const res = UrlFetchApp.fetch('https://api.openai.com/v1/images/generations', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + key },
        payload: JSON.stringify({
            model:           'dall-e-3',
            prompt:          'Simple cute cartoon illustration for Chinese primary school students. Colorful, white background, friendly and clear. Subject: ' + data.prompt,
            n:               1,
            size:            '1024x1024',
            response_format: 'b64_json'
        }),
        muteHttpExceptions: true
    });
    const result = JSON.parse(res.getContentText());
    if (!result.data) throw new Error('OpenAI image error: ' + JSON.stringify(result));
    return { b64: result.data[0].b64_json };
}

// ── 文字转语音（Gemini TTS）──────────────────────────────────
function tts(data) {
    const key = getKeys().gemini;
    const res = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
        {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                contents: [{ parts: [{ text: data.text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } }
                }
            }),
            muteHttpExceptions: true
        }
    );
    const result    = JSON.parse(res.getContentText());
    const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error('TTS error: ' + JSON.stringify(result));
    return { audioData };
}

// ════════════════════════════════════════════════════════════════
//  数据存储函数
// ════════════════════════════════════════════════════════════════

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
        .filter(r => r[0])
        .map(r => {
            let words = [], paras = [];
            try { words = JSON.parse(r[2]); } catch(e) {}
            try { paras = JSON.parse(r[3]); } catch(e) {}
            const attempts = attemptRows.filter(a => a[1] === r[0]);
            return {
                lessonId:       r[0],
                inputText:      r[1],
                wordsPreview:   words.map(w => w.word).join('、'),
                paragraphCount: paras.length,
                attemptCount:   attempts.length,
                completedCount: attempts.filter(a => a[7]).length,
                createdAt:      r[4]
            };
        })
        .reverse();
    return { lessons };
}

function saveAttempt(data) {
    const sheet = getSheet('Attempts');

    if (data.attemptId) {
        const rows = sheet.getDataRange().getValues();
        const idx  = rows.findIndex(r => r[0] === data.attemptId);
        if (idx >= 0) {
            const n = idx + 1;
            sheet.getRange(n, 4).setValue(JSON.stringify(data.wordScores || {}));
            sheet.getRange(n, 5).setValue(JSON.stringify(data.paraScores || {}));
            sheet.getRange(n, 6).setValue(data.totalScore || 0);
            if (data.completedAt) sheet.getRange(n, 8).setValue(data.completedAt);
            return { attemptId: data.attemptId };
        }
    }

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

function getAnalytics(lessonId) {
    const lesson      = getLesson(lessonId);
    const attemptRows = getSheet('Attempts').getDataRange().getValues();
    const attempts    = attemptRows
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
