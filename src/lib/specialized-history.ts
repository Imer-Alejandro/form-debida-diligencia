import {
  emptySpecialized,
  type SpecializedHistoryEntry,
  type SpecializedKind,
  type SpecializedValidation,
} from "@/lib/types";

export interface SpecializedHistoryChange {
  entry: SpecializedHistoryEntry;
  value: SpecializedValidation;
  previous: SpecializedValidation | null;
}

function getAreaValue(
  entry: SpecializedHistoryEntry,
  kind: SpecializedKind
): SpecializedValidation {
  return (
    entry.specialized?.[kind] ??
    entry.evaluation?.section12.specialized?.[kind] ??
    emptySpecialized()
  );
}

function hasChanged(
  current: SpecializedValidation,
  previous: SpecializedValidation
): boolean {
  return (
    current.status !== previous.status ||
    current.notes !== previous.notes ||
    current.date !== previous.date ||
    current.by !== previous.by
  );
}

export function getSpecializedHistoryChanges(
  entries: SpecializedHistoryEntry[],
  kind: SpecializedKind
): SpecializedHistoryChange[] {
  return entries.flatMap((entry, index) => {
    const value = getAreaValue(entry, kind);
    const previous = entries[index + 1]
      ? getAreaValue(entries[index + 1], kind)
      : null;

    return !previous || hasChanged(value, previous)
      ? [{ entry, value, previous }]
      : [];
  });
}
