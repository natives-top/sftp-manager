/// <reference types="vite/client" />

export interface IElectronAPI {
  sftp: {
    connect: (config: any) => Promise<any>
    disconnect: () => Promise<any>
    list: (path: string) => Promise<any>
    download: (remotePath: string, taskId: string, isDirectory: boolean) => Promise<any>
    upload: (localPath: string, remotePath: string, taskId: string) => Promise<any>
    delete: (remotePath: string) => Promise<any>
    mkdir: (remotePath: string) => Promise<any>
    selectFiles: (properties: string[]) => Promise<string[]>
  },
  store: {
    getConnections: () => Promise<any[]>
    saveConnection: (config: any) => Promise<any[]>
    deleteConnection: (id: string) => Promise<any[]>
    getBookmarks: (connectionId: string) => Promise<any[]>
    addBookmark: (bookmark: any) => Promise<void>
    deleteBookmark: (connectionId: string, bookmarkId: string) => Promise<void>
  },
  crypto: {
    encrypt: (text: string) => Promise<string>
    decrypt: (text: string) => Promise<string>
  },
  on: (channel: string, callback: (...args: any[]) => void) => () => void
}

declare global {
  interface Window {
    electron: IElectronAPI
  }
}
