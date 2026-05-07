// ════════════════════════════════════════════════════════════════
//  小状元识字朗读 — GAS 后端（完整版）
//
//  ✅ 图片已预先生成，存于 GitHub Pages，无需任何 API Key
//
//  部署：类型「网页应用程式」，执行身份「我」，存取「任何人」
//
//  初始化步骤（只需做一次）：
//    在 Apps Script 编辑器选择 setupInitialLessons → 点执行
// ════════════════════════════════════════════════════════════════

const DRIVE_FOLDER  = '小状元识字_图片库';
const IMG_BASE      = 'https://vwen123.github.io/Bc1-shizi/images/';

// ════════════════════════════════════════════════════════════════
//  一键初始化预设课程（在 Apps Script 编辑器执行一次即可）
// ════════════════════════════════════════════════════════════════
function setupInitialLessons() {
    // 检查是否已存在课程
    const existing = getSheet('Lessons').getDataRange().getValues().filter(r => r[0]);
    if (existing.length > 0) {
        Logger.log('已存在 ' + existing.length + ' 个课程，跳过初始化。如需重置请先手动清空 Lessons 工作表。');
        return;
    }

    const lessons = [
        {
            unit: '第一单元·新的开始', title: '一、上学了',
            content: '上学了，上学了。花儿跟我招招手，太阳跟我一起走，一起走到校门口。',
            words: [
                { word:'上学', pinyin:'shàng xué', emoji:'🎒', imgPrompt:'child walking to school with backpack', imgUrl: IMG_BASE+'shang-xue.png' },
                { word:'花儿', pinyin:'huā r',     emoji:'🌸', imgPrompt:'colorful blooming flowers',             imgUrl: IMG_BASE+'hua-er.png' },
                { word:'太阳', pinyin:'tài yáng',  emoji:'☀️', imgPrompt:'smiling sun in blue sky',              imgUrl: IMG_BASE+'tai-yang.png' },
                { word:'校门', pinyin:'xiào mén',  emoji:'🏫', imgPrompt:'school entrance gate',                 imgUrl: IMG_BASE+'xiao-men.png' }
            ]
        },
        {
            unit: '第一单元·新的开始', title: '二、早操',
            content: '小鸟儿，起得早，跳来跳去在树枝上做早操。小朋友，起得早，跑来跑去在草地上做早操。',
            words: [
                { word:'小鸟', pinyin:'xiǎo niǎo', emoji:'🐦', imgPrompt:'cute bird on branch',         imgUrl: IMG_BASE+'xiao-niao.png' },
                { word:'早操', pinyin:'zǎo cāo',   emoji:'🤸', imgPrompt:'children morning exercise',  imgUrl: IMG_BASE+'zao-cao.png' },
                { word:'树枝', pinyin:'shù zhī',   emoji:'🌿', imgPrompt:'green tree branch',           imgUrl: IMG_BASE+'shu-zhi.png' },
                { word:'草地', pinyin:'cǎo dì',    emoji:'🌱', imgPrompt:'green grassy meadow',         imgUrl: IMG_BASE+'cao-di.png' }
            ]
        },
        {
            unit: '第二单元·走进教室', title: '一、识字读书长知识',
            content: '上课了，来识字，识了字儿会读书。读儿歌，读故事，天天学习长知识。',
            words: [
                { word:'识字', pinyin:'shí zì',  emoji:'📝', imgPrompt:'Chinese characters on board', imgUrl: IMG_BASE+'shi-zi.png' },
                { word:'读书', pinyin:'dú shū',  emoji:'📖', imgPrompt:'child reading a book',         imgUrl: IMG_BASE+'du-shu.png' },
                { word:'知识', pinyin:'zhī shi', emoji:'💡', imgPrompt:'lightbulb with books',          imgUrl: IMG_BASE+'zhi-shi.png' },
                { word:'儿歌', pinyin:'ér gē',   emoji:'🎵', imgPrompt:'child singing with notes',     imgUrl: IMG_BASE+'er-ge.png' }
            ]
        },
        {
            unit: '第二单元·走进教室', title: '二、学写字',
            content: '小朋友，学写字，一笔一画要写好，眼到手到心也到，笔画笔顺错不了。',
            words: [
                { word:'写字', pinyin:'xiě zì',  emoji:'✏️', imgPrompt:'child writing characters', imgUrl: IMG_BASE+'xie-zi.png' },
                { word:'笔画', pinyin:'bǐ huà',  emoji:'🖊️', imgPrompt:'pencil stroke on paper',   imgUrl: IMG_BASE+'bi-hua.png' },
                { word:'笔顺', pinyin:'bǐ shùn', emoji:'↕️', imgPrompt:'stroke order arrows',      imgUrl: IMG_BASE+'bi-shun.png' },
                { word:'眼到', pinyin:'yǎn dào', emoji:'👀', imgPrompt:'big eyes looking at book',  imgUrl: IMG_BASE+'yan-dao.png' }
            ]
        },
        {
            unit: '第三单元·我爱我的家', title: '一、笑声回来了',
            content: '门开了，爸爸妈妈笑着回来了。门开了，哥哥姐姐笑着回来了。门开了，全家的笑声回来了。',
            words: [
                { word:'笑声', pinyin:'xiào shēng', emoji:'😄', imgPrompt:'happy family laughing',    imgUrl: IMG_BASE+'xiao-sheng.png' },
                { word:'爸爸', pinyin:'bà ba',       emoji:'👨', imgPrompt:'kind smiling father',      imgUrl: IMG_BASE+'ba-ba.png' },
                { word:'妈妈', pinyin:'mā ma',       emoji:'👩', imgPrompt:'gentle smiling mother',    imgUrl: IMG_BASE+'ma-ma.png' },
                { word:'回来', pinyin:'huí lái',     emoji:'🚪', imgPrompt:'person coming home',       imgUrl: IMG_BASE+'hui-lai.png' }
            ]
        },
        {
            unit: '第三单元·我爱我的家', title: '二、星星',
            content: '天上星星那么多，这一颗我妈妈，那一颗我爸爸，中间的一颗是我。三颗星星靠得那样近，那样亲，三颗星星那样明。',
            words: [
                { word:'星星', pinyin:'xīng xīng',  emoji:'⭐', imgPrompt:'twinkling stars in sky', imgUrl: IMG_BASE+'xing-xing.png' },
                { word:'天上', pinyin:'tiān shàng', emoji:'🌌', imgPrompt:'sky above clouds',         imgUrl: IMG_BASE+'tian-shang.png' },
                { word:'中间', pinyin:'zhōng jiān', emoji:'✨', imgPrompt:'middle star glowing',      imgUrl: IMG_BASE+'zhong-jian.png' },
                { word:'三颗', pinyin:'sān kē',     emoji:'🌟', imgPrompt:'three stars together',     imgUrl: IMG_BASE+'san-ke.png' }
            ]
        }
    ];

    lessons.forEach(l => createLesson(l));
    Logger.log('✅ 成功建立 ' + lessons.length + ' 个课程，图片已关联！');

    // 自动发布全部课程
    const sheet = getSheet('Lessons');
    const rows  = sheet.getDataRange().getValues();
    rows.forEach((r, i) => {
        if (r[0]) sheet.getRange(i + 1, 7).setValue('published');
    });
    Logger.log('✅ 全部课程已设为已发布！');
}

// 供网页调用的包装（doPost 路由到此）
function setupInitialLessonsWeb() {
    const existing = getSheet('Lessons').getDataRange().getValues().filter(r => r[0]);
    if (existing.length > 0) {
        return { message: '已存在 ' + existing.length + ' 个课程，无需重复初始化。' };
    }
    setupInitialLessons();
    return { message: '初始化完成' };
}

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
        if (d.action === 'setupInitialLessons') return ok(setupInitialLessonsWeb());
        if (d.action === 'createLesson')        return ok(createLesson(d));
        if (d.action === 'updateLesson')        return ok(updateLesson(d));
        if (d.action === 'deleteLesson')        return ok(deleteLesson(d));
        if (d.action === 'generateOneImage')    return ok(generateOneImage(d));
        if (d.action === 'saveAttempt')         return ok(saveAttempt(d));
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
