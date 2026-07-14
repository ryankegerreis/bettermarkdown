/**
 * Minimal global keyboard-shortcut registry. Combos are normalized strings like
 * `"mod+s"` or `"mod+shift+s"`, where `mod` is ⌘ on macOS and Ctrl elsewhere.
 * App-level shortcuts (open/save/new) live here rather than in the CodeMirror
 * keymap so they fire regardless of focus.
 */
export type ShortcutHandler = () => void;

export type ShortcutMap = Record<string, ShortcutHandler>;

function comboFor(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

/** Attach the shortcut map to `window`; returns a cleanup function. */
export function registerShortcuts(map: ShortcutMap): () => void {
  const handler = (e: KeyboardEvent) => {
    const run = map[comboFor(e)];
    if (run) {
      e.preventDefault();
      run();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
