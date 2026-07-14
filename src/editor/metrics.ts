import type { ChangeSet, Text } from "@codemirror/state";

export function countWords(text: string): number {
  const words = /\S+/g;
  let count = 0;
  while (words.test(text)) count++;
  return count;
}

type DocumentRange = { from: number; to: number };

function addLineRange(
  ranges: DocumentRange[],
  doc: Text,
  from: number,
  to: number,
) {
  const range = {
    from: doc.lineAt(from).from,
    to: doc.lineAt(to).to,
  };
  const previous = ranges[ranges.length - 1];
  if (previous && range.from <= previous.to + 1) {
    previous.to = Math.max(previous.to, range.to);
  } else {
    ranges.push(range);
  }
}

function countRangeWords(doc: Text, ranges: DocumentRange[]): number {
  let words = 0;
  for (const range of ranges) {
    words += countWords(doc.sliceString(range.from, range.to));
  }
  return words;
}

/** Recount only lines touched by a transaction, rather than the whole file. */
export function updatedWordCount(
  previous: number,
  startDoc: Text,
  nextDoc: Text,
  changes: ChangeSet,
): number {
  const before: DocumentRange[] = [];
  const after: DocumentRange[] = [];
  changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    addLineRange(before, startDoc, fromA, toA);
    addLineRange(after, nextDoc, fromB, toB);
  });
  return (
    previous -
    countRangeWords(startDoc, before) +
    countRangeWords(nextDoc, after)
  );
}
