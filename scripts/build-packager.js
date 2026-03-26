#!/usr/bin/env node

const { packager } = require('@electron/packager');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

async function build() {
  try {
    console.log('📦 打包应用...');
    
    const options = {
      dir: '.',
      out: 'release',
      name: '现代化 SFTP 文件管理',
      platform: 'win32',
      arch: 'x64',
      appVersion: '1.3.0',
      buildVersion: '1.3.0',
      icon: path.join(__dirname, '..', 'build/icon.ico'),
      asar: true,
      prune: true,
      overwrite: true,
      ignore: [
        /^\/\.git($|\/)/,
        /^\/\.github($|\/)/,
        /^\/release($|\/)/,
        /^\/\.cache($|\/)/,
        /^\/node_modules\/\.bin($|\/)/,
        /^\/scripts($|\/)/,
        /\.md$/
      ]
    };

    const appPaths = await packager(options);
    console.log(`✓ 打包完成: ${appPaths[0]}`);

    // Create README for users
    const releaseDir = path.join(__dirname, '..', 'release');
    const readmeFile = path.join(releaseDir, 'README.txt');
    const readmeContent = `现代化 SFTP 文件管理 v1.3.0
    
使用说明:
1. 不要移动文件夹中的任何文件
2. 双击 "现代化 SFTP 文件管理-win32-x64" 文件夹
3. 运行其中的 "现代化 SFTP 文件管理.exe"

或者,直接使用 launch-app.bat 启动应用。

系统要求:
- Windows 7 或更高版本
- 250MB 磁盘空间
- 互联网连接(用于 SFTP 连接)
    `;
    fs.writeFileSync(readmeFile, readmeContent);
    console.log(`📋 已创建说明文件: ${readmeFile}`);

    // Copy launch script
    const launchScript = path.join(__dirname, '..', 'launch-app.bat');
    const launchScriptDest = path.join(releaseDir, 'launch-app.bat');
    if (fs.existsSync(launchScript)) {
      fs.copyFileSync(launchScript, launchScriptDest);
      console.log(`✓ 已复制启动脚本`);
    }

    console.log(`\n✅ 构建完成!`);
    console.log(`📁 位置: ${releaseDir}`);
    console.log(`\n应用程序位置:`);
    console.log(`  ${path.join(appPaths[0], '现代化 SFTP 文件管理.exe')}`);

  } catch (err) {
    console.error('❌ 打包失败:', err);
    process.exit(1);
  }
}

build();
