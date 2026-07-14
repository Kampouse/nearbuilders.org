export function normalizeCatalogClaimRoles(roles: string[]) {
  const normalized = new Map<string, string>();
  for (const role of roles) {
    const value = role.trim();
    const key = value.toLowerCase();
    if (value && !normalized.has(key)) normalized.set(key, value);
  }
  return Array.from(normalized.values());
}
