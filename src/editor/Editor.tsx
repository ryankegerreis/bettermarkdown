import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { baseExtensions } from "./extensions";

/** Imperative handle App uses to read/replace the buffer and move focus. */
export interface EditorHandle {
  getContent(): string;
  /** Replace the whole document (resets undo history — used for open/reload). */
  setContent(content: string): void;
  focus(): void;
}

interface EditorProps {
  /** Fires only for user edits (not for programmatic `setContent`). */
  onDocChange: (content: string) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { onDocChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const extensionsRef = useRef<Extension[]>([]);

  // Keep the latest callback without recreating the editor.
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const listener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onDocChangeRef.current(update.state.doc.toString());
      }
    });
    const extensions = [...baseExtensions(), listener];
    extensionsRef.current = extensions;

    const view = new EditorView({
      state: EditorState.create({ doc: "", extensions }),
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => viewRef.current?.state.doc.toString() ?? "",
      setContent: (content) => {
        const view = viewRef.current;
        if (!view) return;
        // A fresh state (rather than a replace transaction) resets undo history
        // so you can't "undo" across an open/reload boundary.
        view.setState(
          EditorState.create({
            doc: content,
            extensions: extensionsRef.current,
          }),
        );
      },
      focus: () => viewRef.current?.focus(),
    }),
    [],
  );

  return <div ref={hostRef} className="h-full min-h-0 w-full" />;
});
