import type { EditorStatus } from "@/editor/Editor";

interface StatusBarProps extends EditorStatus {
  dirty: boolean;
  autosave: boolean;
}

export function StatusBar({
  words,
  characters,
  line,
  column,
  dirty,
  autosave,
}: StatusBarProps) {
  const state = dirty ? (autosave ? "Autosaving…" : "Edited") : "Saved";

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t px-3 text-[11px] tabular-nums text-muted-foreground select-none">
      <span>{state}</span>
      <span className="ml-auto">
        {words.toLocaleString()} {words === 1 ? "word" : "words"}
      </span>
      <span>{characters.toLocaleString()} characters</span>
      <span>
        Ln {line}, Col {column}
      </span>
    </footer>
  );
}
