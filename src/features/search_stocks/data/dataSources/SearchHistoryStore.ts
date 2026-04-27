import type { StockEntity } from '../../domain/entities/StockEntity';

const MAX_HISTORY = 10;

/**
 * In-memory search history store.
 * History persists for the lifetime of the app session.
 * To add persistence, swap this implementation with one backed by
 * a storage library (e.g. react-native-mmkv) once the native build is configured.
 */
export class SearchHistoryStore {
  private history: StockEntity[] = [];

  async getHistory(): Promise<StockEntity[]> {
    return [...this.history].reverse();
  }

  async addItem(item: StockEntity): Promise<void> {
    this.history = this.history.filter(
      (h) => h.companyName !== item.companyName,
    );
    this.history.push(item);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  async deleteItem(item: StockEntity): Promise<void> {
    this.history = this.history.filter(
      (h) => h.companyName !== item.companyName,
    );
  }
}
