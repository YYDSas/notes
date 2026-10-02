# 我的笔记

一个纯前端静态笔记站，用 Markdown 写内容，GitHub Pages 免费托管。

**线上地址：https://yydsas.github.io/notes/**

仓库：https://github.com/YYDSas/notes

## 目录结构

```
notes-site/
├── index.html          # 网站主体（外壳 + 样式 + 渲染逻辑，一般不用改）
├── 发布.bat            # 双击发布到 GitHub
├── 本地预览.bat        # 双击本地预览
├── 使用说明.md         # 详细操作指南
├── notes/              # 所有笔记内容
│   ├── 英语六级/
│   └── 考研政治/
└── assets/             # 图片等资源
```

## 快速开始

1. 写笔记：在 `notes/分类/` 下新建 `.md` 文件
2. 加索引：在 `index.html` 的 `NOTES` 数组里加一行
3. 发布：双击 `发布.bat`

详细步骤见 [使用说明.md](使用说明.md)。

## 部署状态

- [x] 已创建 GitHub 仓库（YYDSas/notes）
- [x] 已开启 GitHub Pages（main / root）
- [x] 已完成首次推送并上线
