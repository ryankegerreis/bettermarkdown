import {
  EditorSelection,
  type EditorState,
  type TransactionSpec,
} from "@codemirror/state";
import type { Command } from "@codemirror/view";

function wrapSelection(
  state: EditorState,
  open: string,
  close: string,
): TransactionSpec {
  return state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to);
    const selectedIsWrapped =
      selected.startsWith(open) && selected.endsWith(close);
    const outsideIsWrapped =
      range.from >= open.length &&
      range.to + close.length <= state.doc.length &&
      state.sliceDoc(range.from - open.length, range.from) === open &&
      state.sliceDoc(range.to, range.to + close.length) === close;

    if (selectedIsWrapped && selected.length >= open.length + close.length) {
      const content = selected.slice(
        open.length,
        selected.length - close.length,
      );
      return {
        changes: { from: range.from, to: range.to, insert: content },
        range: EditorSelection.range(range.from, range.from + content.length),
      };
    }
    if (outsideIsWrapped) {
      return {
        changes: [
          { from: range.from - open.length, to: range.from },
          { from: range.to, to: range.to + close.length },
        ],
        range: EditorSelection.range(
          range.from - open.length,
          range.to - open.length,
        ),
      };
    }
    return {
      changes: {
        from: range.from,
        to: range.to,
        insert: `${open}${selected}${close}`,
      },
      range: EditorSelection.range(
        range.from + open.length,
        range.to + open.length,
      ),
    };
  });
}

function toggleWrap(open: string, close = open): Command {
  return (view) => {
    view.dispatch(wrapSelection(view.state, open, close));
    return true;
  };
}

export const toggleBold = toggleWrap("**");
export const toggleItalic = toggleWrap("*");
export const toggleInlineCode = toggleWrap("`");

export const toggleLink: Command = (view) => {
  const state = view.state;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);

  const completeLink = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(selected);
  if (completeLink) {
    const label = completeLink[1];
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: label },
      selection: {
        anchor: range.from,
        head: range.from + label.length,
      },
    });
    return true;
  }

  if (range.from > 0 && state.sliceDoc(range.from - 1, range.from) === "[") {
    const remainder = state.sliceDoc(range.to, state.doc.lineAt(range.to).to);
    const closing = /^\]\([^)]*\)/.exec(remainder)?.[0];
    if (closing) {
      view.dispatch({
        changes: [
          { from: range.from - 1, to: range.from },
          { from: range.to, to: range.to + closing.length },
        ],
        selection: {
          anchor: range.from - 1,
          head: range.to - 1,
        },
      });
      return true;
    }
  }

  const text = selected || "text";
  const replacement = `[${text}](url)`;
  const urlFrom = range.from + text.length + 3;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: replacement },
    selection: { anchor: urlFrom, head: urlFrom + 3 },
  });
  return true;
};
