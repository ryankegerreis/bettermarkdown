import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { openSearchPanel } from "@codemirror/search";

import { baseExtensions } from "./extensions";
import { markdownFilePath } from "./livePreview";
import {
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleLink,
} from "./livePreview/commands";
import { editorAppearance } from "./theme";
import type { EditorPreferences } from "@/store/settings";

export interface EditorStatus {
  words: number;
  characters: number;
  line: number;
  column: number;
}

/** Imperative handle App uses to read/replace the buffer and move focus. */
export interface EditorHandle {
  getContent(): string;
  /** Replace the whole document (resets undo history — used for open/reload). */
  setContent(content: string): void;
  focus(): void;
  openSearch(): void;
  toggleBold(): void;
  toggleItalic(): void;
  toggleInlineCode(): void;
  toggleLink(): void;
}

interface EditorProps {
  /** Fires only for user edits (not for programmatic `setContent`). */
  onDocChange: (content: string) => void;
  filePath: string | null;
  preferences: EditorPreferences;
  onStatusChange: (status: EditorStatus) => void;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { onDocChange, filePath, preferences, onStatusChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const filePathCompartmentRef = useRef(new Compartment());
  const appearanceCompartmentRef = useRef(new Compartment());
  const filePathRef = useRef(filePath);
  const preferencesRef = useRef(preferences);

  // Keep the latest callback without recreating the editor.
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  function reportStatus(view: EditorView) {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const text = view.state.doc.toString();
    onStatusChangeRef.current({
      words: wordCount(text),
      characters: view.state.doc.length,
      line: line.number,
      column: head - line.from + 1,
    });
  }

  function makeExtensions(listener: Extension): Extension[] {
    return [
      ...baseExtensions(),
      filePathCompartmentRef.current.of(
        markdownFilePath.of(filePathRef.current ?? ""),
      ),
      appearanceCompartmentRef.current.of(
        editorAppearance(preferencesRef.current),
      ),
      listener,
    ];
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const listener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onDocChangeRef.current(update.state.doc.toString());
      }
      if (update.docChanged || update.selectionSet) reportStatus(update.view);
    });
    const extensions = makeExtensions(listener);

    const view = new EditorView({
      state: EditorState.create({ doc: "", extensions }),
      parent: host,
    });
    viewRef.current = view;
    reportStatus(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // filePath updates through the compartment below.

  useEffect(() => {
    filePathRef.current = filePath;
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: filePathCompartmentRef.current.reconfigure(
        markdownFilePath.of(filePath ?? ""),
      ),
    });
  }, [filePath]);

  useEffect(() => {
    preferencesRef.current = preferences;
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: appearanceCompartmentRef.current.reconfigure(
        editorAppearance(preferences),
      ),
    });
  }, [preferences]);

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => viewRef.current?.state.doc.toString() ?? "",
      setContent: (content) => {
        const view = viewRef.current;
        if (!view) return;
        // A fresh state (rather than a replace transaction) resets undo history
        // so you can't "undo" across an open/reload boundary.
        const listener = EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onDocChangeRef.current(update.state.doc.toString());
          }
          if (update.docChanged || update.selectionSet)
            reportStatus(update.view);
        });
        const extensions = makeExtensions(listener);
        view.setState(
          EditorState.create({
            doc: content,
            extensions,
          }),
        );
        reportStatus(view);
      },
      focus: () => viewRef.current?.focus(),
      openSearch: () => {
        const view = viewRef.current;
        if (view) openSearchPanel(view);
      },
      toggleBold: () => {
        const view = viewRef.current;
        if (view) toggleBold(view);
      },
      toggleItalic: () => {
        const view = viewRef.current;
        if (view) toggleItalic(view);
      },
      toggleInlineCode: () => {
        const view = viewRef.current;
        if (view) toggleInlineCode(view);
      },
      toggleLink: () => {
        const view = viewRef.current;
        if (view) toggleLink(view);
      },
    }),
    [],
  );

  return <div ref={hostRef} className="h-full min-h-0 w-full" />;
});
