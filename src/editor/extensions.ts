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
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";

import { bettermarkdownTheme } from "./theme";

/**
 * Base extensions for the M1 "trustworthy plain editor". `markdownLanguage`
 * already bundles GFM (tables, strikethrough, task lists), so no extra
 * `@lezer/markdown` extension is needed here. Live-preview decorations are
 * added in M2 on top of this set.
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
    markdown({ base: markdownLanguage }),
    // Fallback highlight for embedded/non-markdown tokens; markdown tokens are
    // styled by bettermarkdownTheme's HighlightStyle.
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    bettermarkdownTheme,
  ];
}
