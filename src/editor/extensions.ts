import type { Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  keymap,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { markdownLanguage } from "@codemirror/lang-markdown";
import { insertNewlineContinueMarkup } from "@codemirror/lang-markdown";

import { bettermarkdownTheme } from "./theme";
import { livePreview } from "./livePreview";

/**
 * Base extensions for the editor. `markdownLanguage`
 * already bundles GFM (tables, strikethrough, task lists), so no extra
 * `@lezer/markdown` extension is needed here.
 */
export function baseExtensions(): Extension[] {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    markdownLanguage,
    livePreview(),
    // Fallback highlight for embedded/non-markdown tokens; markdown tokens are
    // styled by bettermarkdownTheme's HighlightStyle.
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([
      { key: "Enter", run: insertNewlineContinueMarkup },
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap.filter((binding) => binding.key !== "Mod-f"),
    ]),
    bettermarkdownTheme,
  ];
}
