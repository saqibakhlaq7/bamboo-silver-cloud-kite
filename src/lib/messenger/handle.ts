/** Better Auth needs an email; the user only ever types a username. */
export const HANDLE_DOMAIN = "users.vesper.app";

export function handleEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${HANDLE_DOMAIN}`;
}

export function loginIdentity(input: string): string {
  const v = input.trim().toLowerCase();
  if (v.includes("@")) return v;
  return handleEmail(v);
}
