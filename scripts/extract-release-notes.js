#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/**
 * 从 CHANGELOG.md 中提取指定版本的更新内容
 * @param {string} version - 版本号，如 "1.0.0"
 * @returns {string} - 格式化的更新内容
 */
function extractReleaseNotes(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found');
    process.exit(1);
  }
  
  const content = fs.readFileSync(changelogPath, 'utf8');
  
  // 查找指定版本的内容
  const safeVersion = _.escapeRegExp(version);
  const versionRegex = new RegExp(`## \\[${safeVersion}\\]([\\s\\S]*?)(?=## \\[|$)`, 'i');
  const match = content.match(versionRegex);
  
  if (!match) {
    console.error(`Version ${version} not found in CHANGELOG.md`);
    process.exit(1);
  }
  
  let releaseContent = match[1].trim();
  
  // 移除日期信息
  releaseContent = releaseContent.replace(/^- \d{4}-\d{2}-\d{2}/, '').trim();
  
  return releaseContent;
}

/**
 * 将 Markdown 内容转换为 GitHub Release 格式
 * @param {string} content - Markdown 内容
 * @param {string} version - 版本号
 * @returns {string} - 格式化的 Release 内容
 */
function formatReleaseNotes(content, version) {
  const header = `## 🚀 Release ${version}\n\n`;
  
  const installSection = `\n### 📦 安装方式
\`\`\`bash
npm install koishi-plugin-imx@${version}
\`\`\`

### 📖 文档
完整使用文档请查看 [README.md](https://github.com/sysfox/koishi-plugin-imx/blob/main/README.md)

完整更新日志请查看 [CHANGELOG.md](https://github.com/sysfox/koishi-plugin-imx/blob/main/CHANGELOG.md)`;

  return header + content + installSection;
}

// 命令行参数处理
const version = process.argv[2];
if (!version) {
  console.error('Usage: node extract-release-notes.js <version>');
  process.exit(1);
}

try {
  const releaseNotes = extractReleaseNotes(version);
  const formattedNotes = formatReleaseNotes(releaseNotes, version);
  console.log(formattedNotes);
} catch (error) {
  console.error('Error extracting release notes:', error.message);
  process.exit(1);
}
