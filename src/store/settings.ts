import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";

const RECENT_MAX = 10;

/** Lazily-opened handle to `settings.json` in the app config dir. */
let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("settings.json", { autoSave: true, defaults: {} });
  }
  return storePromise;
}

interface SettingsState {
  autosave: boolean;
  recentFiles: string[];
  hydrated: boolean;

  /** Load persisted settings from disk (call once on startup). */
  hydrate(): Promise<void>;
  setAutosave(autosave: boolean): Promise<void>;
  addRecent(path: string): Promise<void>;
  removeRecent(path: string): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  autosave: false,
  recentFiles: [],
  hydrated: false,

  async hydrate() {
    const store = await getStore();
    const autosave = (await store.get<boolean>("autosave")) ?? false;
    const recentFiles = (await store.get<string[]>("recentFiles")) ?? [];
    set({ autosave, recentFiles, hydrated: true });
  },

  async setAutosave(autosave) {
    set({ autosave });
    const store = await getStore();
    await store.set("autosave", autosave);
  },

  async addRecent(path) {
    const recentFiles = [
      path,
      ...get().recentFiles.filter((p) => p !== path),
    ].slice(0, RECENT_MAX);
    set({ recentFiles });
    const store = await getStore();
    await store.set("recentFiles", recentFiles);
  },

  async removeRecent(path) {
    const recentFiles = get().recentFiles.filter((p) => p !== path);
    set({ recentFiles });
    const store = await getStore();
    await store.set("recentFiles", recentFiles);
  },
}));
