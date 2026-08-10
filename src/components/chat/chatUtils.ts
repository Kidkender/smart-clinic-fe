export function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}
