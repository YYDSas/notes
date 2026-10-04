# 我的笔记

一个纯前端静态笔记站，用 Markdown 写内容，GitHub Pages 免费托管。

**线上地址：https://yydsas.github.io/notes/**

仓库：https://github.com/YYDSas/notes

**本地目录：`E:\mynotes\notes-site`（唯一工作目录）**

## 目录结构

```
E:\mynotes\notes-site\
├── index.html          # 网站主体（外壳 + 样式 + 渲染逻辑，一般不用改）
├── quiz.html           # 自测复习页（今日复习 / 抽题 / 全部题目 / 进度统计）
├── quiz-questions.js   # 自测题库（69 题，题在题库里，答案默认不显示）
├── .check.js           # 全站自检：索引 / 双链 / 题库一致性
├── 发布.bat            # 双击发布到 GitHub
├── 本地预览.bat        # 双击本地预览
├── 使用说明.md         # 详细操作指南
└── notes/              # 所有笔记内容
    ├── SystemVerilog/  # SV 知识点（类与对象、封装、继承、随机约束、覆盖率…）
    ├── SV错题本/       # 易错点归纳（代码书写类、结构理解类）
    ├── UVM/            # UVM 知识点（相位、工厂、序列、TLM、报告）
    └── 仿真工具/       # Questa 避坑、环境搭建、命令行与 Makefile
```

## 快速开始

1. 写笔记：在 `notes/分类/` 下新建 `.md` 文件
2. 加索引：在 `index.html` 的 `NOTES` 数组里加一行
3. **给这篇笔记配 3 道自测题**：在 `quiz-questions.js` 里加 3 条（`note` 字段填笔记路径）
4. 自检：`node .check.js`
5. 发布：双击 `发布.bat`

## 自测复习

线上：**https://yydsas.github.io/notes/quiz.html**

每道题默认**只显示题干**，答案要点要主动点开 —— 这是刻意的（看答案练的是"认出来"，自己想练的是"写出来"）。
自评「想起来了 / 没想起来」会按 1 → 3 → 7 → 21 天自动排期，进度存在浏览器 localStorage 里。

详细说明见 [使用说明.md](使用说明.md) 的「二·五、自测复习」。

## 部署状态

- [x] 已创建 GitHub 仓库（YYDSas/notes）
- [x] 已开启 GitHub Pages（main / root）
- [x] 已完成首次推送并上线
- [x] 已迁移到 `E:\mynotes\notes-site`
