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
    return history;
  }
}
