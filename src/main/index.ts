import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SftpService } from './SftpService'
import { CryptoService } from './CryptoService'
import { StoreService } from './StoreService'

let mainWindow: BrowserWindow | null = null;
const sftpService = new SftpService();
const cryptoService = new CryptoService();
const storeService = new StoreService();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.sftpmanager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('sftp:connect', async (_, config) => {
    return await sftpService.connect(config);
  });
  
  ipcMain.handle('sftp:disconnect', async () => {
    return await sftpService.disconnect();
  });

  ipcMain.handle('sftp:list', async (_, path) => {
    return await sftpService.list(path);
  });

  ipcMain.handle('sftp:download', async (_, remotePath, taskId, isDirectory) => {
    if (mainWindow) {
      return await sftpService.download(mainWindow, remotePath, taskId, isDirectory);
    }
    return { success: false, error: 'No main window' };
  });

  ipcMain.handle('sftp:batchDownload', async (_, remotePaths, taskIds, isDirectories) => {
    if (mainWindow) {
      return await sftpService.batchDownload(mainWindow, remotePaths, taskIds, isDirectories);
    }
    return { success: false, error: 'No main window' };
  });

  ipcMain.handle('sftp:upload', async (_, localPath, remotePath, taskId) => {
    if (mainWindow) {
      return await sftpService.upload(mainWindow, localPath, remotePath, taskId);
    }
    return { success: false, error: 'No main window' };
  });

  ipcMain.handle('sftp:delete', async (_, remotePath) => {
    return await sftpService.delete(remotePath);
  });

  ipcMain.handle('sftp:mkdir', async (_, remotePath) => {
    return await sftpService.mkdir(remotePath);
  });
  
  ipcMain.handle('sftp:selectFiles', async (_, properties) => {
    if (mainWindow) {
      return await sftpService.selectFiles(mainWindow, properties);
    }
    return [];
  });

  ipcMain.handle('store:getConnections', () => {
    return storeService.getConnections();
  });

  ipcMain.handle('store:saveConnection', (_, config) => {
    return storeService.saveConnection(config);
  });

  ipcMain.handle('store:deleteConnection', (_, id) => {
    return storeService.deleteConnection(id);
  });

  // Bookmarks
  ipcMain.handle('store:getBookmarks', (_, connectionId) => {
    return storeService.getBookmarks(connectionId);
  });

  ipcMain.handle('store:addBookmark', (_, bookmark) => {
    return storeService.addBookmark(bookmark);
  });

  ipcMain.handle('store:deleteBookmark', (_, connectionId, bookmarkId) => {
    return storeService.deleteBookmark(connectionId, bookmarkId);
  });

  ipcMain.handle('crypto:encrypt', (_, text) => {
    return cryptoService.encrypt(text);
  });

  ipcMain.handle('crypto:decrypt', (_, text) => {
    return cryptoService.decrypt(text);
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
