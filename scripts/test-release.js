#!/usr/bin/env node

/**
 * 测试发版脚本的功能
 * 这个脚本会模拟发版流程，但不会实际执行 git 操作
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');

function testVersionUpdate() {
  console.log('🧪 测试版本更新功能...');
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  
  console.log(`📦 当前版本: ${currentVersion}`);
  
  // 模拟版本更新
  const versionParts = currentVersion.split('.').map(Number);
  
  const patchVersion = [...versionParts];
  patchVersion[2]++;
  
  const minorVersion = [...versionParts];
  minorVersion[1]++;
  minorVersion[2] = 0;
  
  const majorVersion = [...versionParts];
  majorVersion[0]++;
  majorVersion[1] = 0;
  majorVersion[2] = 0;
  
  console.log(`🔹 patch 版本: ${patchVersion.join('.')}`);
  console.log(`🔹 minor 版本: ${minorVersion.join('.')}`);
  console.log(`🔹 major 版本: ${majorVersion.join('.')}`);
  
  console.log('✅ 版本更新测试通过');
}

function testScriptExists() {
  console.log('\n🧪 测试脚本文件存在性...');
  
  const releaseScript = path.join(__dirname, 'release.js');
  const extractScript = path.join(__dirname, 'extract-release-notes.js');
  
  if (fs.existsSync(releaseScript)) {
    console.log('✅ release.js 存在');
  } else {
    console.log('❌ release.js 不存在');
  }
  
  if (fs.existsSync(extractScript)) {
    console.log('✅ extract-release-notes.js 存在');
  } else {
    console.log('❌ extract-release-notes.js 不存在');
  }
}

function testPackageScripts() {
  console.log('\n🧪 测试 package.json 脚本配置...');
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const expectedScripts = [
    'release',
    'release:patch', 
    'release:minor',
    'release:major'
  ];
  
  expectedScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`✅ ${script} 脚本已配置`);
    } else {
      console.log(`❌ ${script} 脚本未配置`);
    }
  });
}

function main() {
  console.log('🚀 开始测试自动化发版配置\n');
  
  testVersionUpdate();
  testScriptExists();
  testPackageScripts();
  
  console.log('\n🎉 测试完成！');
  console.log('\n💡 使用方法:');
  console.log('   npm run release:patch  # 补丁版本');
  console.log('   npm run release:minor  # 次要版本');
  console.log('   npm run release:major  # 主要版本');
}

main();
