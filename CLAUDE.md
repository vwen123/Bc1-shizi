# 小状元识字朗读 — 项目文档

马来西亚小学一年级华文识字朗读练习网站。

---

## 项目概况

| 项目 | 详情 |
|------|------|
| GitHub 仓库 | https://github.com/vwen123/Bc1-shizi |
| 学生页面 | https://vwen123.github.io/Bc1-shizi/index.html |
| 老师控制台 | https://vwen123.github.io/Bc1-shizi/teacher.html |
| 老师密码 | `8888`（可在 teacher.html 第一行 `TEACHER_PIN` 修改） |
| Firebase 项目 | `huawen-class` |
| GitHub 账号 | vwen123 |

---

## 技术架构

```
GitHub Pages (静态托管)
├── index.html      学生端
├── teacher.html    老师端
├── images/         预生成词语插图（24张 DALL-E 3）
└── Code.gs         已废弃（原 GAS 后端，现存档用）

Firebase Firestore (数据库)
├── /lessons        课程数据
└── /attempts       学生练习记录
```

### 前端依赖（CDN）
- Tailwind CSS — 样式
- HanziWriter 3.5 — 笔顺动画 + 描红练习
- Font Awesome 6 — 图标
- Google Fonts — Ma Shan Zheng（汉字）、Noto Sans SC
- pinyin-pro — 自动拼音（teacher.html）
- Chart.js — 数据图表（teacher.html）
- Firebase JS SDK 11 (compat) — Firestore

---

## Firebase 配置

```javascript
firebase.initializeApp({
    apiKey:            "AIzaSyCVnBotyPuwS9xfUl7YCN2jS7gXUHIQyHc",
    authDomain:        "huawen-class.firebaseapp.com",
    projectId:         "huawen-class",
    storageBucket:     "huawen-class.firebasestorage.app",
    messagingSenderId: "606012248377",
    appId:             "1:606012248377:web:7f55bb58ed2abd1c4458e8"
});
```

### Firestore 安全规则（firestore.rules）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{lessonId} {
      allow read: if true;
      allow write: if true;
    }
    match /attempts/{attemptId} {
      allow read: if true;
      allow create, update: if true;
    }
  }
}
```

### Firestore 数据结构

**`/lessons/{auto-id}`**
```
unit:       string   "第一单元·新的开始"
title:      string   "一、上学了"
content:    string   完整课文
words:      array    [{word, pinyin, emoji, imgUrl}]
status:     string   "draft" | "published"
createdAt:  timestamp
```

**`/attempts/{auto-id}`**
```
lessonId:    string
lessonTitle: string
unit:        string
studentName: string
scores:      map      {"word-0": 85, "para-0": 70, ...}
totalScore:  number
startedAt:   timestamp
completedAt: timestamp | null
```

---

## 课程数据

目前共 **4 单元 8 课**，图片已预生成存于 `images/` 文件夹。

| 单元 | 课题 | 生词 |
|------|------|------|
| 第一单元·新的开始 | 一、上学了 | 上学、花儿、太阳、校门 |
| 第一单元·新的开始 | 二、早操 | 小鸟、早操、树枝、草地 |
| 第二单元·走进教室 | 一、识字读书长知识 | 识字、读书、知识、儿歌 |
| 第二单元·走进教室 | 二、学写字 | 写字、笔画、笔顺、眼到 |
| 第三单元·我爱我的家 | 一、笑声回来了 | 笑声、爸爸、妈妈、回来 |
| 第三单元·我爱我的家 | 二、星星 | 星星、天上、中间、三颗 |
| 第九单元·心爱的东西 | 一、睡衣 | 夜、黑色、换、森林 |
| 第九单元·心爱的东西 | 二、铅笔 | 用、铅笔、文字、图画 |

图片 URL 格式：`https://vwen123.github.io/Bc1-shizi/images/{拼音}.png`
例：`https://vwen123.github.io/Bc1-shizi/images/shang-xue.png`

---

## 功能说明

### 学生端（index.html）

**流程：** 输入名字 → 选课 → 第一关（认词）→ 第二关（朗读）→ 奖励

**第一关：认读生词**
- 词语卡片：图片 + 拼音 + 汉字
- 🔊 听读音（`speechSynthesis`，Web Speech API，免费）
- ✏️ 笔顺练习（HanziWriter，动画演示 + 描红）
- 🎤 朗读录音（`SpeechRecognition`，Web Speech API）

**第二关：金声朗读**
- 显示段落文字
- 范读 + 挑战朗读
- 实时字符高亮（按顺序匹配，读对变绿）

**评分算法**
```javascript
// 顺序匹配 60% + 字符匹配 40%
score = (seqHits / totalChars * 0.6 + setHits / totalChars * 0.4) * 100
```

**录音功能**
- `continuous: true` — 持续聆听，不会中途断掉
- 停顿 1.8 秒自动结束
- 再次点击按钮可手动停止
- `onspeechstart` — 检测到声音即时反馈

### 老师端（teacher.html）

**PIN 保护：** 默认密码 `8888`

**功能：**
- 新建 / 编辑 / 删除课程
- 输入词语自动生成拼音（pinyin-pro 库）
- 词语支持填入图片网址（GitHub Pages URL）
- 一键初始化 6 课预设课程
- 学生数据分析：人数、得分、柱状图

---

## 图片管理

图片在本地生成（DALL-E 3），存入 `images/` 文件夹，由 GitHub Pages 免费托管。

**不在网页运行时生成图片**（速度慢、收费）。

### 新增课文图片流程
1. 告知词语，由 Claude 生成图片并推送 GitHub
2. 图片网址格式：`https://vwen123.github.io/Bc1-shizi/images/{拼音}.png`
3. 在老师端编辑课程，填入图片网址

### 图片文件命名规则
- 拼音 + 连字符，例：`shang-xue.png`、`xiao-niao.png`

### 当前图片列表（32张）
```
shang-xue  hua-er   tai-yang  xiao-men
xiao-niao  zao-cao  shu-zhi   cao-di
shi-zi     du-shu   zhi-shi   er-ge
xie-zi     bi-hua   bi-shun   yan-dao
xiao-sheng ba-ba    ma-ma     hui-lai
xing-xing  tian-shang  zhong-jian  san-ke
ye         hei-se   huan      sen-lin
yong       qian-bi  wen-zi    tu-hua
```

---

## 推送更新流程

```bash
# 修改文件后
git add .
git commit -m "说明修改内容"
git push
# 约 1-2 分钟后 GitHub Pages 更新
```

---

## 历史决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 数据存储 | Firebase Firestore | 比 GAS 快 5-10 倍，无冷启动 |
| 图片生成 | 预生成存 GitHub | 不依赖 API，秒加载，免费 |
| TTS | Web speechSynthesis | 免费，无需 API key |
| 朗读评分 | Web SpeechRecognition | 免费，实时识别 |
| 笔顺描红 | HanziWriter | 开源，支持中文笔顺数据 |
| 托管 | GitHub Pages | 免费，稳定 |
| 之前曾用 | Google Apps Script | 已废弃，速度慢（2-5s 冷启动） |

---

## 注意事项

- **录音**需要 Chrome 或 Edge 浏览器（SpeechRecognition API）
- **Gemini API key** 已失效（推到公开 GitHub 后被 Google 自动撤销），不要重复使用
- **OpenAI key** 未推到 GitHub（只用于本地生成图片）
- Firebase API key 可公开（已通过 Firestore 安全规则保护）
- 老师密码存于 `localStorage`，清除浏览器数据会需要重新输入
