/**
 * Returns `true` when the field's group list intersects the active groups.
 *
 * Rules:
 * - If the field has **no** group restriction (`groups` is `undefined` or
 *   empty) it is always included (group-agnostic).
 * - If the field **has** a group restriction, at least one group from the
 *   active set must appear in the field's groups for the field to be included.
 * - If `activeGroups` is `undefined` or empty, only group-agnostic fields are
 *   included.
 *
 * @example
 * groupMatches(['admin'], ['admin', 'superuser']) // true
 * groupMatches(['admin'], ['user']) // false
 * groupMatches(undefined, ['admin']) // true  — no restriction
 * groupMatches(['admin'], undefined) // false — caller has no groups
 */
export function groupMatches(
  fieldGroups: string[] | undefined,
  activeGroups: string[] | undefined,
): boolean {
  if (!fieldGroups || fieldGroups.length === 0) return true
  if (!activeGroups || activeGroups.length === 0) return false
  return fieldGroups.some((g) => activeGroups.includes(g))
}
