import type { EditorState } from "@codemirror/state";

/**
 * Markdown syntax stays visible whenever any selection touches the element.
 * The comparison is intentionally inclusive so a caret immediately before or
 * after a span reveals its markers too.
 */
export function selectionTouches(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  return state.selection.ranges.some(
    (selection) => selection.from <= to && selection.to >= from,
  );
}
