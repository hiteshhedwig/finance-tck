import type { SessionStorageBackend } from '@nhost/nhost-js/session';
import type { Session } from '@nhost/nhost-js/session';

const STORAGE_KEY = 'nhostSession';

class LocalStorageBackend implements SessionStorageBackend {
  private cache: Session | null = null;

  get(): Session | null {
    return this.cache;
  }

  set(value: Session): void {
    this.cache = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {}
  }

  remove(): void {
    this.cache = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async initialize(): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw) as Session;
      }
    } catch {
      this.cache = null;
    }
  }
}

export const storageBackend = new LocalStorageBackend();
