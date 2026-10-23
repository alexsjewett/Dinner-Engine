/**
 * UI-only presentation policy. Model/schema/provider safety checks remain
 * unchanged. Skip repetitive, generic cooking disclaimers in recommendation
 * cards and recipe details while preserving concrete dietary conflicts and
 * helpful ingredient-specific guidance.
 */
export function isGenericAiDisclaimer(note: string): boolean {
  const value = note.toLowerCase().replace(/\s+/g, " ").trim();
  if (!value) return true;
  // General instructions to review an entire recipe or all food labels.
  if (/\b(review|check|verify|double.check|confirm)\b/.test(value) &&
      (/(original|full|complete) recipe/.test(value) ||
       /\ball (ingredient )?labels?\b/.test(value) ||
       /\blabels? and (the )?(original|full|complete) recipe\b/.test(value)))
    return true;
  // Free-floating declarations that AI suggestions cannot certify safety.
  if (/(safety (is|isn't|cannot be|can not be|not) guaranteed|safety is not guaranteed|not (guaranteed|certified|verified) (to be )?(allergy|gluten|food).?safe|not a guarantee of safety)/.test(value))
    return true;
  // Repetitive generic cross-contact guidance is not a recipe-specific tip.
  if (/cross.contact/.test(value) &&
      (/\blabel/.test(value) || /\b(review|check|verify)\b/.test(value)))
    return true;
  return false;
}
/** Strip boilerplate sentences without discarding useful recipe-specific advice. */
export function cleanAiNote(note: string): string {
  return note.split(/(?<=[.!?])\s+/)
    .filter(sentence => !isGenericAiDisclaimer(sentence))
    .join(" ").trim();
}
export function usefulAiNotes(notes: readonly string[]): string[] {
  return notes.map(cleanAiNote).filter(Boolean);
}
