/** @file Reglas puras para comparar la autorización firmada y la vigente. */
const normalizedRoles = (value: unknown): string[] => (
  Array.isArray(value) ? value : []
).filter((role): role is string => typeof role === 'string')
  .map((role) => role.trim())
  .filter(Boolean)
  .sort();

export const sameRoles = (claimed: unknown, current: string | null): boolean => {
  const left = normalizedRoles(claimed);
  const right = (current ?? '').split(',').filter(Boolean).sort();
  return left.length === right.length && left.every((role, index) => role === right[index]);
};
