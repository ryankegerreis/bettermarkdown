import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";

const RECENT_MAX = 10;

export type ThemePreference = "system" | "light" | "dark";
export type EditorFont = "sans" | "serif" | "mono";

export interface EditorPreferences {
  fontFamily: EditorFont;
  fontSize: number;
  lineWidth: number;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontFamily: "sans",
  fontSize: 16,
  lineWidth: 72,
};

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
  theme: ThemePreference;
  editor: EditorPreferences;
  recentFiles: string[];
  hydrated: boolean;

  /** Load persisted settings from disk (call once on startup). */
  hydrate(): Promise<void>;
  setAutosave(autosave: boolean): Promise<void>;
  setTheme(theme: ThemePreference): Promise<void>;
  setEditor(editor: Partial<EditorPreferences>): Promise<void>;
  addRecent(path: string): Promise<void>;
  removeRecent(path: string): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  autosave: false,
  theme: "system",
  editor: DEFAULT_EDITOR_PREFERENCES,
  recentFiles: [],
  hydrated: false,

  async hydrate() {
    const store = await getStore();
    const autosave = (await store.get<boolean>("autosave")) ?? false;
    const theme =
      (await store.get<ThemePreference>("theme")) ?? ("system" as const);
    const persistedEditor =
      await store.get<Partial<EditorPreferences>>("editor");
    const editor = { ...DEFAULT_EDITOR_PREFERENCES, ...persistedEditor };
    const recentFiles = (await store.get<string[]>("recentFiles")) ?? [];
    set({ autosave, theme, editor, recentFiles, hydrated: true });
  },

  async setAutosave(autosave) {
    set({ autosave });
    const store = await getStore();
    await store.set("autosave", autosave);
  },

  async setTheme(theme) {
    set({ theme });
    const store = await getStore();
    await store.set("theme", theme);
  },

  async setEditor(patch) {
    const editor = { ...get().editor, ...patch };
    set({ editor });
    const store = await getStore();
    await store.set("editor", editor);
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
