import * as SecureStore from 'expo-secure-store';
import type { SessionStorageBackend } from '@nhost/nhost-js/session';
import type { Session } from '@nhost/nhost-js/session';

const STORAGE_KEY = 'nhostSession';

class SecureStoreBackend implements SessionStorageBackend {
  private cache: Session | null = null;

  get(): Session | null {
    return this.cache;
  }

  set(value: Session): void {
    this.cache = value;
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value)).catch(() => {});
  }

  remove(): void {
    this.cache = null;
    SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
  }

  async initialize(): Promise<void> {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      try {
        this.cache = JSON.parse(raw) as Session;
      } catch {
        this.cache = null;
      }
    }
  }
}

export const storageBackend = new SecureStoreBackend();
