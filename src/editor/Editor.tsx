import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  Compartment,
  EditorState,
  type Extension,
  type Text,
} from "@codemirror/state";
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
import { countWords, updatedWordCount } from "./metrics";
import type { EditorPreferences } from "@/store/settings";

export interface EditorStatus {
  words: number;
  characters: number;
  line: number;
  column: number;
}

export interface EditorSnapshot {
  content: string;
  document: Text;
}

/** Imperative handle App uses to read/replace the buffer and move focus. */
export interface EditorHandle {
  getContent(): string;
  getSnapshot(): EditorSnapshot;
  /** Make a previously captured snapshot the on-disk dirty baseline. */
  markSaved(snapshot: EditorSnapshot): boolean;
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
  /** Initial buffer used when the lazily-loaded editor first mounts. */
  initialContent: string;
  /** Fires only for user edits (not for programmatic `setContent`). */
  onDirtyChange: (dirty: boolean) => void;
  filePath: string | null;
  preferences: EditorPreferences;
  onStatusChange: (status: EditorStatus) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { initialContent, onDirtyChange, filePath, preferences, onStatusChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const filePathCompartmentRef = useRef(new Compartment());
  const appearanceCompartmentRef = useRef(new Compartment());
  const filePathRef = useRef(filePath);
  const preferencesRef = useRef(preferences);
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;
  const savedDocumentRef = useRef<Text | null>(null);
  /** Word count cached per document version; selection moves reuse it. */
  const wordsRef = useRef(0);

  // Keep the latest callback without recreating the editor.
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const reportStatus = useCallback((view: EditorView) => {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    onStatusChangeRef.current({
      words: wordsRef.current,
      characters: view.state.doc.length,
      line: line.number,
      column: head - line.from + 1,
    });
  }, []);

  const makeExtensions = useCallback(
    (): Extension[] => [
      ...baseExtensions(),
      filePathCompartmentRef.current.of(
        markdownFilePath.of(filePathRef.current ?? ""),
      ),
      appearanceCompartmentRef.current.of(
        editorAppearance(preferencesRef.current),
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          wordsRef.current = updatedWordCount(
            wordsRef.current,
            update.startState.doc,
            update.state.doc,
            update.changes,
          );
          onDirtyChangeRef.current(
            !update.state.doc.eq(
              savedDocumentRef.current ?? update.startState.doc,
            ),
          );
        }
        if (update.docChanged || update.selectionSet) reportStatus(update.view);
      }),
    ],
    [reportStatus],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const extensions = makeExtensions();

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions,
    });
    wordsRef.current = countWords(state.doc.sliceString(0));
    savedDocumentRef.current = state.doc;
    const view = new EditorView({
      state,
      parent: host,
    });
    viewRef.current = view;
    reportStatus(view);
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Both deps are stable useCallbacks; filePath updates through the
    // compartment below, so the editor is created exactly once.
  }, [makeExtensions, reportStatus]);

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
      getSnapshot: () => {
        const document = viewRef.current?.state.doc ?? EditorState.create().doc;
        return { content: document.toString(), document };
      },
      markSaved: (snapshot) => {
        savedDocumentRef.current = snapshot.document;
        return !(viewRef.current?.state.doc.eq(snapshot.document) ?? true);
      },
      setContent: (content) => {
        const view = viewRef.current;
        if (!view) return;
        // A fresh state (rather than a replace transaction) resets undo history
        // so you can't "undo" across an open/reload boundary.
        const state = EditorState.create({
          doc: content,
          extensions: makeExtensions(),
        });
        wordsRef.current = countWords(content);
        savedDocumentRef.current = state.doc;
        view.setState(state);
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
    [makeExtensions, reportStatus],
  );

  return <div ref={hostRef} className="h-full min-h-0 w-full" />;
});
