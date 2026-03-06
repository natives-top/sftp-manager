import Store from 'electron-store';

export class StoreService {
  private store: Store;

  constructor() {
    this.store = new Store({ name: 'connections' });
  }

  getConnections() {
    return this.store.get('history') || [];
  }

  saveConnection(config: any) {
    const history: any[] = (this.store.get('history') || []) as any[];
    const index = history.findIndex(c => c.id === config.id);
    if (index >= 0) {
      history[index] = config;
    } else {
      history.push({ ...config, id: Date.now().toString() });
    }
    this.store.set('history', history);
    return history;
  }

  deleteConnection(id: string) {
    let history: any[] = (this.store.get('history') || []) as any[];
    history = history.filter(c => c.id !== id);
    this.store.set('history', history);
    // 同时删除该连接下的所有书签
    this.deleteBookmarksByConnection(id);
    return history;
  }

  // ---- Bookmarks ----

  getBookmarks(connectionId: string): any[] {
    const all: any = this.store.get('bookmarks') || {};
    return all[connectionId] || [];
  }

  addBookmark(bookmark: any): any[] {
    const all: any = this.store.get('bookmarks') || {};
    const list: any[] = all[bookmark.connectionId] || [];
    // 避免重复：同连接同路径不重复添加
    if (list.some(b => b.path === bookmark.path)) {
      return list;
    }
    list.push(bookmark);
    all[bookmark.connectionId] = list;
    this.store.set('bookmarks', all);
    return list;
  }

  deleteBookmark(connectionId: string, bookmarkId: string): any[] {
    const all: any = this.store.get('bookmarks') || {};
    let list: any[] = all[connectionId] || [];
    list = list.filter(b => b.id !== bookmarkId);
    all[connectionId] = list;
    this.store.set('bookmarks', all);
    return list;
  }

  private deleteBookmarksByConnection(connectionId: string): void {
    const all: any = this.store.get('bookmarks') || {};
    delete all[connectionId];
    this.store.set('bookmarks', all);
  }
}
