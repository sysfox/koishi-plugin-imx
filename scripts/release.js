#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagePath = path.join(__dirname, '..', 'package.json');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

/**
 * 执行命令并输出结果
 * @param {string} command - 要执行的命令
 * @param {string} description - 命令描述
 */
function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(`✅ ${description} 完成`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error.message);
    process.exit(1);
  }
}

/**
 * 获取版本类型
 * @param {string} type - 版本类型 (patch|minor|major)
 * @returns {string}
 */
function getVersionType(type) {
  const validTypes = ['patch', 'minor', 'major'];
  if (!type || !validTypes.includes(type)) {
    console.log('请指定版本类型: patch (补丁), minor (次要), major (主要)');
    console.log('使用方法: npm run release [patch|minor|major]');
    process.exit(1);
  }
  return type;
}

/**
 * 更新 package.json 版本
 * @param {string} versionType - 版本类型
 * @returns {string} - 新版本号
 */
function updateVersion(versionType) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  
  // 使用 npm version 命令更新版本
  const result = runCommand(`npm version ${versionType} --no-git-tag-version`, '更新版本号');
  
  // 重新读取更新后的版本
  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const newVersion = updatedPackageJson.version;
  
  console.log(`📦 版本从 ${currentVersion} 更新到 ${newVersion}`);
  return newVersion;
}

/**
 * 更新 CHANGELOG.md
 * @param {string} version - 新版本号
 */
function updateChangelog(version) {
  const today = new Date().toISOString().split('T')[0];
  
  if (!fs.existsSync(changelogPath)) {
    console.log('📝 创建 CHANGELOG.md');
    const initialContent = `# Changelog

## [${version}] - ${today}

### Added
- 初始版本发布

`;
    fs.writeFileSync(changelogPath, initialContent);
    return;
  }
  
  // 检查是否已经有该版本的条目
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  if (changelogContent.includes(`## [${version}]`)) {
    console.log('✅ CHANGELOG.md 已包含该版本的更新内容');
    return;
  }
  
  console.log('\n📝 请更新 CHANGELOG.md，添加新版本的更新内容');
  console.log(`新版本: ${version}`);
  console.log('格式示例:');
  console.log(`## [${version}] - ${today}`);
  console.log('');
  console.log('### Added');
  console.log('- 新功能描述');
  console.log('');
  console.log('### Fixed');
  console.log('- 修复的问题');
  console.log('');
  
  // 自动在 CHANGELOG.md 顶部添加新版本模板
  const lines = changelogContent.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## [')) || 2;
  
  const newEntry = [
    `## [${version}] - ${today}`,
    '',
    '### Added',
    '- 请在此处添加新功能描述',
    '',
    '### Changed', 
    '- 请在此处添加修改的功能描述',
    '',
    '### Fixed',
    '- 请在此处添加修复的问题描述',
    '',
    ''
  ];
  
  lines.splice(insertIndex, 0, ...newEntry);
  fs.writeFileSync(changelogPath, lines.join('\n'));
  
  console.log('✅ 已在 CHANGELOG.md 中添加版本模板，请编辑后按回车键继续...');
  
  // 等待用户确认
  try {
    require('child_process').execSync('read -p ""', { stdio: 'inherit', shell: '/bin/bash' });
  } catch (error) {
    // 在某些环境下可能不支持 read 命令，使用替代方案
    console.log('请手动编辑 CHANGELOG.md 后按 Ctrl+C 退出，然后重新运行发版命令');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(0));
  }
}

/**
 * 主函数
 */
function main() {
  const versionType = getVersionType(process.argv[2]);
  
  console.log('🚀 开始自动化发版流程');
  console.log(`📦 版本类型: ${versionType}`);
  
  // 1. 检查工作目录是否干净
  console.log('\n🔍 检查工作目录状态...');
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
    console.log('✅ 工作目录干净');
  } catch (error) {
    console.error('❌ 工作目录不干净，请先提交或暂存所有更改');
    console.log('\n💡 提示: 可以使用以下命令查看未提交的更改:');
    console.log('   git status');
    console.log('   git diff');
    process.exit(1);
  }
  
  // 2. 检查是否在主分支
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      console.log(`⚠️  当前分支: ${currentBranch}`);
      console.log('💡 建议在主分支进行发版操作');
    }
  } catch (error) {
    // 忽略分支检查错误
  }
  
  // 3. 更新版本号
  const newVersion = updateVersion(versionType);
  
  // 4. 更新 CHANGELOG
  updateChangelog(newVersion);
  
  // 5. 构建项目
  runCommand('npm run build', '构建项目');
  
  // 6. 提交更改
  runCommand('git add .', '暂存文件');
  runCommand(`git commit -m "chore: release v${newVersion}"`, '提交版本更新');
  
  // 7. 创建标签
  runCommand(`git tag v${newVersion}`, '创建版本标签');
  
  // 8. 推送到远程仓库
  runCommand('git push', '推送到远程仓库');
  runCommand('git push --tags', '推送标签');
  
  console.log('\n🎉 发版流程完成！');
  console.log(`📦 新版本: v${newVersion}`);
  console.log('🔗 GitHub Actions 将自动发布到 npm 和创建 GitHub Release');
  console.log('📱 查看发布进度: https://github.com/sysfox/koishi-plugin-imx/actions');
  console.log(`📋 查看 Release: https://github.com/sysfox/koishi-plugin-imx/releases/tag/v${newVersion}`);
}

// 执行主函数
main();
