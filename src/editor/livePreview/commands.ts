import {
  EditorSelection,
  type EditorState,
  type TransactionSpec,
} from "@codemirror/state";
import type { Command } from "@codemirror/view";

export type FormatAction =
  | { kind: "heading"; level: 1 | 2 | 3 }
  | { kind: "bold" }
  | { kind: "italic" }
  | { kind: "strikethrough" }
  | { kind: "inlineCode" }
  | { kind: "bulletList" }
  | { kind: "numberedList" }
  | { kind: "taskList" }
  | { kind: "blockquote" }
  | { kind: "codeBlock" }
  | { kind: "horizontalRule" }
  | { kind: "link" }
  | { kind: "image" }
  | { kind: "table"; rows: number; cols: number };

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
export const toggleStrikethrough = toggleWrap("~~");
export const toggleInlineCode = toggleWrap("`");

type PrefixForLine = string | ((index: number) => string);

function toggleLinePrefix(
  prefix: PrefixForLine,
  ownPrefix: RegExp,
  replacePrefix = ownPrefix,
): Command {
  return (view) => {
    const { state } = view;
    const changes: { from: number; to: number; insert: string }[] = [];

    for (const range of state.selection.ranges) {
      const selectionEnd =
        range.to > range.from ? Math.max(range.from, range.to - 1) : range.to;
      const firstLine = state.doc.lineAt(range.from).number;
      const lastLine = state.doc.lineAt(selectionEnd).number;
      const lines = Array.from(
        { length: lastLine - firstLine + 1 },
        (_, index) => state.doc.line(firstLine + index),
      );
      const remove = lines.every((line) => ownPrefix.test(line.text));

      lines.forEach((line, index) => {
        const match = (remove ? ownPrefix : replacePrefix).exec(line.text);
        const marker = match?.[0] ?? "";
        const insert = remove
          ? ""
          : typeof prefix === "function"
            ? prefix(index)
            : prefix;
        changes.push({
          from: line.from,
          to: line.from + marker.length,
          insert,
        });
      });
    }

    const changeSet = state.changes(changes);
    view.dispatch({
      changes: changeSet,
      selection: EditorSelection.create(
        state.selection.ranges.map((range) =>
          EditorSelection.range(
            changeSet.mapPos(range.anchor, 1),
            changeSet.mapPos(range.head, 1),
          ),
        ),
        state.selection.mainIndex,
      ),
    });
    return true;
  };
}

const headingPrefix = /^#{1,6}\s+/;
const listPrefix = /^(?:[-+*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/;

export function toggleHeading(level: 1 | 2 | 3): Command {
  const marker = `${"#".repeat(level)} `;
  return toggleLinePrefix(
    marker,
    new RegExp(`^#{${level}}\\s+`),
    headingPrefix,
  );
}

export const toggleBulletList = toggleLinePrefix(
  "- ",
  /^[-+*]\s+(?!\[[ xX]\]\s+)/,
  listPrefix,
);
export const toggleNumberedList = toggleLinePrefix(
  (index) => `${index + 1}. `,
  /^\d+[.)]\s+/,
  listPrefix,
);
export const toggleTaskList = toggleLinePrefix(
  "- [ ] ",
  /^[-+*]\s+\[[ xX]\]\s+/,
  listPrefix,
);
export const toggleBlockquote = toggleLinePrefix("> ", /^>\s?/);

function insertTemplate(
  view: Parameters<Command>[0],
  build: (selected: string) => {
    text: string;
    selectionOffset: number;
    selectionLength: number;
  },
): boolean {
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);
  const template = build(selected);
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: template.text },
    selection: {
      anchor: range.from + template.selectionOffset,
      head: range.from + template.selectionOffset + template.selectionLength,
    },
  });
  return true;
}

export const insertCodeBlock: Command = (view) =>
  insertTemplate(view, (selected) => {
    const content = selected || "code";
    return {
      text: `\`\`\`\n${content}\n\`\`\``,
      selectionOffset: 4,
      selectionLength: content.length,
    };
  });

export const insertHorizontalRule: Command = (view) =>
  insertTemplate(view, () => {
    const range = view.state.selection.main;
    const before =
      range.from > 0 && view.state.sliceDoc(range.from - 1, range.from) !== "\n"
        ? "\n\n"
        : "";
    const after =
      range.to < view.state.doc.length &&
      view.state.sliceDoc(range.to, range.to + 1) !== "\n"
        ? "\n\n"
        : "\n";
    return {
      text: `${before}---${after}`,
      selectionOffset: before.length + 4,
      selectionLength: 0,
    };
  });

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

export const insertImage: Command = (view) =>
  insertTemplate(view, (selected) => {
    const alt = selected || "alt text";
    return {
      text: `![${alt}](url)`,
      selectionOffset: alt.length + 4,
      selectionLength: 3,
    };
  });

export function insertTable(
  view: Parameters<Command>[0],
  rows: number,
  cols: number,
) {
  const safeRows = Math.max(1, Math.floor(rows));
  const safeCols = Math.max(1, Math.floor(cols));
  return insertTemplate(view, () => {
    const headers = Array.from(
      { length: safeCols },
      (_, index) => `Header ${index + 1}`,
    );
    const header = `| ${headers.join(" | ")} |`;
    const divider = `| ${Array.from({ length: safeCols }, () => "---").join(" | ")} |`;
    const body = `| ${Array.from({ length: safeCols }, () => "").join(" | ")} |`;
    const text = [
      header,
      divider,
      ...Array.from({ length: Math.max(0, safeRows - 1) }, () => body),
    ].join("\n");
    return {
      text,
      selectionOffset: 2,
      selectionLength: headers[0].length,
    };
  });
}

export function applyFormatAction(
  view: Parameters<Command>[0],
  action: FormatAction,
) {
  switch (action.kind) {
    case "heading":
      return toggleHeading(action.level)(view);
    case "bold":
      return toggleBold(view);
    case "italic":
      return toggleItalic(view);
    case "strikethrough":
      return toggleStrikethrough(view);
    case "inlineCode":
      return toggleInlineCode(view);
    case "bulletList":
      return toggleBulletList(view);
    case "numberedList":
      return toggleNumberedList(view);
    case "taskList":
      return toggleTaskList(view);
    case "blockquote":
      return toggleBlockquote(view);
    case "codeBlock":
      return insertCodeBlock(view);
    case "horizontalRule":
      return insertHorizontalRule(view);
    case "link":
      return toggleLink(view);
    case "image":
      return insertImage(view);
    case "table":
      return insertTable(view, action.rows, action.cols);
  }
}
