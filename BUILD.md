# 自动化构建指南

## 概述

本项目使用 GitHub Actions 进行自动化构建和发布。当推送标签时，会自动构建 Windows、macOS 和 Linux 三个平台的可执行文件。

## 构建流程

### 1. 自动触发条件

- **按标签推送**: 当推送以 `v` 开头的标签时（如 `v1.3.0`）
- **手动触发**: 可通过 GitHub Actions 工作流手动运行

### 2. 构建步骤

1. **签出代码** - 从 Git 检出源代码
2. **安装依赖** - 运行 `npm ci` 安装依赖
3. **构建应用** - 编译 TypeScript 和 React 代码
4. **打包应用** - 使用 electron-builder 创建可执行文件
5. **清理产物** - 移除不必要的构建文件，只保留可执行程序
6. **上传产物** - 上传到 GitHub Actions artifact
7. **创建发布** - 生成 GitHub Release 并附加所有产物

## 产物说明

构建后只保留以下文件：

| 平台 | 文件格式 | 大小 | 说明 |
|------|--------|------|------|
| Windows | `.exe` | ~69MB | 便携式可执行文件，无需安装 |
| macOS | `.dmg` | ~95MB | 磁盘镜像文件，拖入 Applications 即可 |
| Linux | `.AppImage` | ~105MB | 通用 Linux 可执行文件 |

### 清理规则

构建后自动删除：
- `__appImage-x64/` - AppImage 构建中间文件
- `win-unpacked/` - Windows 构建中间文件
- `linux-unpacked/` - Linux 构建中间文件
- `mac-unpacked/` - macOS 构建中间文件
- `builder-debug.yml` - 构建调试文件
- `builder-effective-config.yaml` - 构建配置文件
- 其他非可执行文件

## 本地构建

### 构建所有平台

```bash
npm run dist
```

### 仅构建特定平台

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

### 清理产物

```bash
npm run cleanup
```

这将删除 release 目录中的所有中间文件，只保留最终的可执行文件。

## 版本管理

### 发布新版本

1. **更新版本号**
   ```bash
   # 编辑 package.json 中的 version 字段
   ```

2. **提交代码**
   ```bash
   git add .
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

3. **创建标签**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z - Description"
   git push origin vX.Y.Z
   ```

### 触发构建

推送标签后，GitHub Actions 会自动开始构建。可以在以下位置查看进度：

- **GitHub**: https://github.com/natives-top/sftp-manager/actions
- 或者查看 Releases 页面：https://github.com/natives-top/sftp-manager/releases

## 发布说明

GitHub Release 包含以下信息：

- 平台和文件说明
- 功能描述
- 提交日志链接

### 示例发布内容

```markdown
## 现代化 SFTP 文件管理 v1.3.0

### 下载

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `现代化 SFTP 文件管理-1.3.0.exe` | 双击即可运行，无需安装 |
| macOS | `现代化 SFTP 文件管理-1.3.0-mac.dmg` | 打开后拖入 Applications |
| Linux | `现代化 SFTP 文件管理-1.3.0-linux.AppImage` | `chmod +x` 后直接运行 |

### 特性
- 支持 SFTP 文件管理
- 路径别名功能
- 完整的中英文界面支持
- 跨平台支持
```

## 常见问题

### Q: 如何只构建一个平台的产物？

A: 使用特定平台的构建脚本：
```bash
npm run dist:win    # 仅 Windows
npm run dist:mac    # 仅 macOS
npm run dist:linux  # 仅 Linux
```

### Q: 如何查看构建日志？

A: 
- 本地构建：查看控制台输出
- GitHub Actions：访问 Actions 页面查看详细日志

### Q: 如何跳过某个平台的构建？

A: 修改 `.github/workflows/release.yml` 中的 matrix 配置，注释掉不需要的平台。

### Q: 产物太大了怎么办？

A: 目前优化选项有限，因为需要包含运行时环境。可以考虑：
- 使用更高的压缩率（electron-builder 配置中调整）
- 移除不必要的依赖
- 使用 web 版本代替

## 相关文件

- **工作流配置**: `.github/workflows/release.yml`
- **清理脚本**: `scripts/cleanup-release.js`
- **构建配置**: `package.json` 中的 `build` 字段
- **电子构建配置**: `electron.vite.config.ts`
