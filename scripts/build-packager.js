#!/usr/bin/env node

const { packager } = require('@electron/packager');
const path = require('path');
const fs = require('fs');

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

    // Create a simple wrapper executable
    const releasePath = path.join(__dirname, '..', 'release', '现代化 SFTP 文件管理-1.3.0.exe');
    const unpackedExe = path.join(appPaths[0], '现代化 SFTP 文件管理.exe');
    
    if (fs.existsSync(unpackedExe)) {
      console.log(`📋 复制 exe 到发布目录...`);
      // Create release directory if it doesn't exist
      const releaseDir = path.dirname(releasePath);
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true });
      }
      fs.copyFileSync(unpackedExe, releasePath);
      console.log(`✓ 完成: ${releasePath}`);
    } else {
      console.error(`❌ 未找到 exe: ${unpackedExe}`);
    }

  } catch (err) {
    console.error('❌ 打包失败:', err);
    process.exit(1);
  }
}

build();
