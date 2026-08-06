export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (local.length <= 4) {
    return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 1))}${domain}`;
  }

  return `${local.slice(0, 2)}${'*'.repeat(6)}${local.slice(-2)}${domain}`;
}
