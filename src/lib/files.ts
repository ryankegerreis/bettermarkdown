import { invoke } from "@tauri-apps/api/core";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";

/** Extensions offered in the open/save dialogs. */
const MD_FILTERS = [
  { name: "Markdown", extensions: ["md", "markdown", "txt"] },
];

/** Read a file as UTF-8 text (rejects non-UTF-8 with an error). */
export function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/** Atomically write `contents` to `path`. */
export function saveFile(path: string, contents: string): Promise<void> {
  return invoke<void>("save_file", { path, contents });
}

export interface FileMeta {
  mtime_ms: number;
  size: number;
}

export function fileMetadata(path: string): Promise<FileMeta> {
  return invoke<FileMeta>("file_metadata", { path });
}

/** Start emitting `file-changed` events for this path. */
export function watchFile(path: string): Promise<void> {
  return invoke<void>("watch_file", { path });
}

export function unwatchFile(path: string): Promise<void> {
  return invoke<void>("unwatch_file", { path });
}

/** The file this process was launched with (double-click / "open with"). */
export function initialFile(): Promise<string | null> {
  return invoke<string | null>("initial_file");
}

/** Show a native open dialog filtered to markdown; returns the chosen path. */
export async function pickOpenPath(): Promise<string | null> {
  const result = await openDialog({
    multiple: false,
    directory: false,
    filters: MD_FILTERS,
  });
  return typeof result === "string" ? result : null;
}

/** Show a native save dialog; returns the chosen path. */
export function pickSavePath(defaultPath?: string): Promise<string | null> {
  return saveDialog({ filters: MD_FILTERS, defaultPath });
}

/** Final path segment, handling both `/` and `\` separators. */
export function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}
