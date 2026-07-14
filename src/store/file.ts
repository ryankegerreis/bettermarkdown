import { create } from "zustand";

/**
 * Identity and status of the buffer currently in the editor. The document text
 * itself lives in CodeMirror, not here — this store only tracks *which* file is
 * open and whether it is dirty / diverged from disk.
 */
interface FileState {
  /** Absolute path, or null for an untitled buffer. */
  path: string | null;
  /** Whether a buffer is open at all (controls empty state vs. editor). */
  active: boolean;
  /** Unsaved edits since the last save/load. */
  dirty: boolean;
  /** The file changed on disk while we had unsaved edits (reload prompt). */
  externalChanged: boolean;

  /** Adopt a buffer identity (after open/new/save-as). */
  open(path: string | null): void;
  /** Return to the empty state. */
  close(): void;
  setDirty(dirty: boolean): void;
  setExternalChanged(externalChanged: boolean): void;
}

export const useFile = create<FileState>((set) => ({
  path: null,
  active: false,
  dirty: false,
  externalChanged: false,

  open: (path) =>
    set({ path, active: true, dirty: false, externalChanged: false }),
  close: () =>
    set({ path: null, active: false, dirty: false, externalChanged: false }),
  setDirty: (dirty) => set((s) => (s.dirty === dirty ? s : { dirty })),
  setExternalChanged: (externalChanged) => set({ externalChanged }),
}));
