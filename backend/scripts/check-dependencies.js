#!/usr/bin/env node
/**
 * 依赖检查脚本
 * 用于验证所有必需的依赖是否已正确安装
 * 
 * 使用方法:
 *   node backend/scripts/check-dependencies.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查项目依赖...\n');
console.log('='.repeat(60));

// 后端必需依赖
const backendRequiredDeps = {
  'express': 'Web 框架',
  'mongoose': 'MongoDB ODM',
  'cors': '跨域支持',
  'dotenv': '环境变量管理',
  'bcrypt': '密码加密',
  'jsonwebtoken': 'JWT 认证',
  'naughty-words': '脏话过滤库 ⚠️ 用户名验证必需',
  'string-similarity': '字符串相似度',
  'node-fetch': 'HTTP 请求'
};

// 前端必需依赖（简化检查）
const frontendRequiredDeps = {
  'react': 'React 框架',
  'react-dom': 'React DOM',
  'vite': '构建工具',
  '@radix-ui/react-dialog': 'UI 组件'
};

// 检查依赖是否安装
function checkDependency(depName, description, projectPath) {
  try {
    const depPath = path.join(projectPath, 'node_modules', depName);
    const packageJsonPath = path.join(depPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`✅ ${depName.padEnd(25)} ${description.padEnd(30)} 版本: ${pkg.version}`);
      return { installed: true, version: pkg.version };
    } else {
      console.log(`❌ ${depName.padEnd(25)} ${description.padEnd(30)} 未安装`);
      return { installed: false };
    }
  } catch (err) {
    console.log(`❌ ${depName.padEnd(25)} ${description.padEnd(30)} 检查失败: ${err.message}`);
    return { installed: false, error: err.message };
  }
}

// 检查后端依赖
console.log('\n📦 后端依赖检查:');
console.log('-'.repeat(60));

const projectRoot = path.join(__dirname, '../..');
const backendPath = path.join(projectRoot, 'backend');
const frontendPath = path.join(projectRoot, 'frontend');

let backendMissing = [];
let frontendMissing = [];

for (const [dep, desc] of Object.entries(backendRequiredDeps)) {
  const result = checkDependency(dep, desc, backendPath);
  if (!result.installed) {
    backendMissing.push(dep);
  }
}

// 检查前端依赖
console.log('\n📦 前端依赖检查:');
console.log('-'.repeat(60));

for (const [dep, desc] of Object.entries(frontendRequiredDeps)) {
  const result = checkDependency(dep, desc, frontendPath);
  if (!result.installed) {
    frontendMissing.push(dep);
  }
}

// 检查 package.json 文件
console.log('\n📄 配置文件检查:');
console.log('-'.repeat(60));

const backendPackageJson = path.join(backendPath, 'package.json');
const frontendPackageJson = path.join(frontendPath, 'package.json');

if (fs.existsSync(backendPackageJson)) {
  console.log('✅ backend/package.json 存在');
} else {
  console.log('❌ backend/package.json 不存在');
}

if (fs.existsSync(frontendPackageJson)) {
  console.log('✅ frontend/package.json 存在');
} else {
  console.log('❌ frontend/package.json 不存在');
}

// 检查 node_modules 目录
console.log('\n📁 目录检查:');
console.log('-'.repeat(60));

const backendNodeModules = path.join(backendPath, 'node_modules');
const frontendNodeModules = path.join(frontendPath, 'node_modules');

if (fs.existsSync(backendNodeModules)) {
  const stats = fs.statSync(backendNodeModules);
  console.log(`✅ backend/node_modules 存在`);
} else {
  console.log('❌ backend/node_modules 不存在 - 需要运行 npm install');
}

if (fs.existsSync(frontendNodeModules)) {
  console.log(`✅ frontend/node_modules 存在`);
} else {
  console.log('❌ frontend/node_modules 不存在 - 需要运行 npm install');
}

// 检查关键文件
console.log('\n📋 关键文件检查:');
console.log('-'.repeat(60));

const usernameValidator = path.join(backendPath, 'utils', 'usernameValidator.js');
const usernameWhitelist = path.join(backendPath, 'utils', 'usernameWhitelist.json');
const usernameBlacklist = path.join(backendPath, 'utils', 'usernameBlacklist.json');

if (fs.existsSync(usernameValidator)) {
  console.log('✅ backend/utils/usernameValidator.js 存在');
} else {
  console.log('❌ backend/utils/usernameValidator.js 不存在');
}

if (fs.existsSync(usernameWhitelist)) {
  console.log('✅ backend/utils/usernameWhitelist.json 存在');
} else {
  console.log('⚠️  backend/utils/usernameWhitelist.json 不存在（可选）');
}

if (fs.existsSync(usernameBlacklist)) {
  console.log('✅ backend/utils/usernameBlacklist.json 存在');
} else {
  console.log('⚠️  backend/utils/usernameBlacklist.json 不存在（可选）');
}

// 总结
console.log('\n' + '='.repeat(60));
console.log('📊 检查总结:');
console.log('-'.repeat(60));

if (backendMissing.length === 0 && frontendMissing.length === 0) {
  console.log('✅ 所有必需依赖已安装！');
  process.exit(0);
} else {
  console.log('❌ 发现缺失的依赖:');
  
  if (backendMissing.length > 0) {
    console.log('\n后端缺失依赖:');
    for (const dep of backendMissing) {
      console.log(`   - ${dep}`);
    }
    console.log('\n安装命令:');
    console.log(`   cd ${backendPath}`);
    console.log(`   npm install ${backendMissing.join(' ')}`);
  }
  
  if (frontendMissing.length > 0) {
    console.log('\n前端缺失依赖:');
    for (const dep of frontendMissing) {
      console.log(`   - ${dep}`);
    }
    console.log('\n安装命令:');
    console.log(`   cd ${frontendPath}`);
    console.log(`   npm install ${frontendMissing.join(' ')}`);
  }
  
  // 特别提醒 naughty-words
  if (backendMissing.includes('naughty-words')) {
    console.log('\n⚠️  重要提醒:');
    console.log('   naughty-words 库缺失会导致用户名验证返回 500 错误！');
    console.log('   请立即安装: npm install naughty-words');
  }
  
  process.exit(1);
}

