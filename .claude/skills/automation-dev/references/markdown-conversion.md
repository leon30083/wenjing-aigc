# Markdown 转换完整指南

## 安装 markitdown（支持 PDF）

### 使用 uv（推荐）

```bash
# 重要：使用 [pdf] extra 支持 PDF
uv tool install "markitdown[pdf]"

# 强制重新安装
uv tool install "markitdown[pdf]" --force
```

### 使用 pip

```bash
pip install "markitdown[pdf]"
```

### 验证安装

```bash
markitdown --version
```

## 基本转换

### PDF 转 Markdown

```bash
# 输出到文件
markitdown "document.pdf" -o output.md

# 重定向输出
markitdown "document.pdf" > output.md
```

### Word 转 Markdown

```bash
markitdown "document.docx" -o output.md
```

### PowerPoint 转 Markdown

```bash
markitdown "presentation.pptx" -o output.md
```

## PDF 图片提取

### Step 1: 转换文本

```bash
markitdown "document.pdf" -o output.md
```

### Step 2: 提取图片

```bash
# 创建 assets 目录
mkdir -p assets

# 使用 PyMuPDF 提取图片
uv run --with pymupdf python scripts/extract_pdf_images.py "document.pdf" ./assets
```

### Step 3: 添加图片引用

在 markdown 中插入图片引用：

```markdown
![描述](assets/img_page1_1.png)
```

### Step 4: 格式清理

markitdown 输出通常需要手动修复：
- 添加正确的标题级别 (`#`, `##`, `###`)
- 重建 markdown 格式的表格
- 修复错误的换行
- 恢复缩进结构

## 路径转换（Windows/WSL）

### 自动转换

```bash
# Windows → WSL
C:\Users\name\file.pdf → /mnt/c/Users/name/file.pdf

# 使用辅助脚本
python scripts/convert_path.py "C:\Users\name\Documents\file.pdf"
```

### 手动转换规则

| Windows 路径 | WSL 路径 |
|------------|----------|
| `C:\` | `/mnt/c/` |
| `D:\` | `/mnt/d/` |
| `E:\` | `/mnt/e/` |

## 常见问题

### "dependencies needed to read .pdf files"

```bash
# 安装 PDF 支持
uv tool install "markitdown[pdf]" --force

# 或使用 pip
pip install "markitdown[pdf]" --force --upgrade
```

### FontBBox 警告

这些是无害的字体解析警告，输出仍然正确。

### 输出中缺少图片

1. 使用 `scripts/extract_pdf_images.py` 单独提取图片
2. 手动在 markdown 中添加图片引用
3. 将图片放在与 markdown 相同的目录或 `assets/` 子目录

### 格式清理提示

**添加标题级别**:
```markdown
# 一级标题
## 二级标题
### 三级标题
```

**重建表格**:
```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
```

**修复列表**:
```markdown
- 无序列表项
- 另一项

1. 有序列表项
2. 另一项
```

## 高级用法

### 批量转换

```bash
# 转换目录中的所有 PDF
for file in *.pdf; do
  markitdown "$file" -o "${file%.pdf}.md"
done
```

### 自定义输出

```bash
# 指定输出目录
markitdown "document.pdf" -o ./output/output.md

# 指定输出格式（markdown 是默认值）
markitdown "document.pdf" -o output.md --format markdown
```

### 处理 Confluence 导出

Confluence 导出的文档通常需要特殊处理：

1. **清理 HTML 标签**: 移除不必要的 HTML
2. **转换链接**: 更新内部链接为 markdown 格式
3. **处理图片**: 下载图片并更新引用
4. **格式化表格**: Confluence 表格需要转换为 markdown 表格

---

**最后更新**: 2026-01-23
**来源**: markdown-tools skill (94 lines)
