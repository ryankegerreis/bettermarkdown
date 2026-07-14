import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
} from "@codemirror/view";
import type { SyntaxNodeRef } from "@lezer/common";

import { selectionTouches } from "./reveal";
import {
  BulletWidget,
  CheckboxWidget,
  HorizontalRuleWidget,
  ImageWidget,
} from "./widgets";

function nodeChildren(node: SyntaxNodeRef, name: string) {
  return node.node.getChildren(name);
}

function addLines(
  view: EditorView,
  ranges: Range<Decoration>[],
  from: number,
  to: number,
  className: string,
  visibleFrom: number,
  visibleTo: number,
) {
  const clippedFrom = Math.max(from, visibleFrom);
  const clippedTo = Math.min(to, visibleTo);
  if (clippedFrom > clippedTo) return;
  let line = view.state.doc.lineAt(clippedFrom);
  while (line.from <= clippedTo) {
    ranges.push(Decoration.line({ class: className }).range(line.from));
    if (line.to >= clippedTo || line.number === view.state.doc.lines) break;
    line = view.state.doc.line(line.number + 1);
  }
}

function listDepth(node: SyntaxNodeRef): number {
  let depth = 0;
  for (let current = node.node.parent; current; current = current.parent) {
    if (current.name === "BulletList" || current.name === "OrderedList")
      depth++;
  }
  return Math.min(4, Math.max(1, depth));
}

function emphasis(
  view: EditorView,
  node: SyntaxNodeRef,
  ranges: Range<Decoration>[],
  markerName: string,
  className: string,
) {
  const markers = nodeChildren(node, markerName);
  if (markers.length < 2) return;
  const first = markers[0];
  const last = markers[markers.length - 1];
  ranges.push(Decoration.mark({ class: className }).range(first.to, last.from));
  if (!selectionTouches(view.state, node.from, node.to)) {
    for (const marker of markers) {
      ranges.push(Decoration.replace({}).range(marker.from, marker.to));
    }
  }
}

function link(
  view: EditorView,
  node: SyntaxNodeRef,
  ranges: Range<Decoration>[],
) {
  const marks = nodeChildren(node, "LinkMark");
  const url = node.node.getChild("URL");
  if (marks.length < 4 || !url) return;
  const labelFrom = marks[0].to;
  const labelTo = marks[1].from;
  const href = view.state.sliceDoc(url.from, url.to);
  ranges.push(
    Decoration.mark({
      class: "cm-live-link",
      attributes: { "data-href": href },
    }).range(labelFrom, labelTo),
  );
  if (!selectionTouches(view.state, node.from, node.to)) {
    ranges.push(Decoration.replace({}).range(node.from, labelFrom));
    ranges.push(Decoration.replace({}).range(labelTo, node.to));
  }
}

function image(
  view: EditorView,
  node: SyntaxNodeRef,
  ranges: Range<Decoration>[],
  filePath: string,
) {
  if (selectionTouches(view.state, node.from, node.to)) return;
  const marks = nodeChildren(node, "LinkMark");
  const url = node.node.getChild("URL");
  if (marks.length < 4 || !url) return;
  const alt = view.state.sliceDoc(marks[0].to, marks[1].from);
  const source = view.state.sliceDoc(url.from, url.to);
  ranges.push(
    Decoration.replace({
      widget: new ImageWidget(source, alt, filePath),
    }).range(node.from, node.to),
  );
}

/** Build decorations only for the ranges CodeMirror has put in the viewport. */
export function buildDecorations(
  view: EditorView,
  filePath: string,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);

  for (const visible of view.visibleRanges) {
    tree.iterate({
      from: visible.from,
      to: visible.to,
      enter(node) {
        const revealed = selectionTouches(view.state, node.from, node.to);

        if (/^ATXHeading[1-6]$/.test(node.name)) {
          const level = node.name[node.name.length - 1];
          addLines(
            view,
            ranges,
            node.from,
            node.to,
            `cm-live-h${level}`,
            visible.from,
            visible.to,
          );
          const marker = node.node.getChild("HeaderMark");
          if (marker && !revealed) {
            const after = view.state.sliceDoc(marker.to, marker.to + 1);
            const to = after === " " ? marker.to + 1 : marker.to;
            ranges.push(Decoration.replace({}).range(marker.from, to));
          }
          return;
        }

        switch (node.name) {
          case "StrongEmphasis":
            emphasis(view, node, ranges, "EmphasisMark", "cm-live-strong");
            return;
          case "Emphasis":
            emphasis(view, node, ranges, "EmphasisMark", "cm-live-emphasis");
            return;
          case "Strikethrough":
            emphasis(view, node, ranges, "StrikethroughMark", "cm-live-strike");
            return;
          case "InlineCode":
            emphasis(view, node, ranges, "CodeMark", "cm-live-inline-code");
            return false;
          case "Blockquote": {
            addLines(
              view,
              ranges,
              node.from,
              node.to,
              "cm-live-blockquote",
              visible.from,
              visible.to,
            );
            if (!revealed) {
              for (const marker of nodeChildren(node, "QuoteMark").filter(
                (candidate) =>
                  candidate.to >= visible.from && candidate.from <= visible.to,
              )) {
                const after = view.state.sliceDoc(marker.to, marker.to + 1);
                ranges.push(
                  Decoration.replace({}).range(
                    marker.from,
                    after === " " ? marker.to + 1 : marker.to,
                  ),
                );
              }
            }
            return;
          }
          case "ListItem": {
            addLines(
              view,
              ranges,
              node.from,
              node.to,
              `cm-live-list-item cm-live-list-depth-${listDepth(node)}`,
              visible.from,
              visible.to,
            );
            const marker = node.node.getChild("ListMark");
            if (marker && !revealed) {
              const value = view.state.sliceDoc(marker.from, marker.to);
              if (/^[-+*]$/.test(value)) {
                ranges.push(
                  Decoration.replace(
                    node.node.getChild("Task")
                      ? {}
                      : { widget: new BulletWidget() },
                  ).range(marker.from, marker.to),
                );
              } else {
                ranges.push(
                  Decoration.mark({ class: "cm-live-list-number" }).range(
                    marker.from,
                    marker.to,
                  ),
                );
              }
            }
            return;
          }
          case "TaskMarker": {
            const task = node.node.parent;
            const taskRevealed = task
              ? selectionTouches(view.state, task.from, task.to)
              : revealed;
            if (!taskRevealed) {
              const checked = /x/i.test(
                view.state.sliceDoc(node.from, node.to),
              );
              ranges.push(
                Decoration.replace({
                  widget: new CheckboxWidget(checked, node.from),
                }).range(node.from, node.to),
              );
            }
            return false;
          }
          case "HorizontalRule":
            if (!revealed) {
              ranges.push(
                Decoration.replace({
                  widget: new HorizontalRuleWidget(),
                }).range(node.from, node.to),
              );
            }
            return false;
          case "Link":
            link(view, node, ranges);
            return false;
          case "Image":
            image(view, node, ranges, filePath);
            return false;
          case "FencedCode": {
            addLines(
              view,
              ranges,
              node.from,
              node.to,
              "cm-live-code-block",
              visible.from,
              visible.to,
            );
            for (const marker of nodeChildren(node, "CodeMark")) {
              const line = view.state.doc.lineAt(marker.from);
              ranges.push(
                Decoration.line({ class: "cm-live-code-fence" }).range(
                  line.from,
                ),
              );
            }
            return false;
          }
          case "Table":
            addLines(
              view,
              ranges,
              node.from,
              node.to,
              "cm-live-table",
              visible.from,
              visible.to,
            );
            return false;
        }
      },
    });
  }

  return Decoration.set(ranges, true);
}
