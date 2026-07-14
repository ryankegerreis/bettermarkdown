import { ChangeSet, Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { updatedWordCount } from "./metrics";

function countWords(value: string): number {
  return value.match(/\S+/g)?.length ?? 0;
}

function applyChanges(
  value: string,
  changes: Parameters<typeof ChangeSet.of>[0],
): { actual: number; expected: number } {
  const start = Text.of(value.split("\n"));
  const changeSet = ChangeSet.of(changes, start.length);
  const next = changeSet.apply(start);
  return {
    actual: updatedWordCount(countWords(value), start, next, changeSet),
    expected: countWords(next.toString()),
  };
}

describe("updatedWordCount", () => {
  it("updates a word edited in place", () => {
    const result = applyChanges("one two three", {
      from: 4,
      to: 7,
      insert: "second",
    });
    expect(result.actual).toBe(result.expected);
  });

  it("handles splitting and joining lines", () => {
    const split = applyChanges("alpha beta", { from: 5, insert: "\nnew" });
    expect(split.actual).toBe(split.expected);

    const joined = applyChanges("alpha\nbeta", { from: 5, to: 6 });
    expect(joined.actual).toBe(joined.expected);
  });

  it("merges overlapping line ranges from a multi-change transaction", () => {
    const result = applyChanges("one two\nthree four\nfive six", [
      { from: 0, to: 3, insert: "first item" },
      { from: 14, to: 18, insert: "fourth item" },
    ]);
    expect(result.actual).toBe(result.expected);
  });
});
