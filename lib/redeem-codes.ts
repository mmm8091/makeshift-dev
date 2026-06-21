const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_GROUPS = 4;
const CODE_GROUP_LENGTH = 5;
const CODE_PREFIX = "CTBZ";

export class RedeemCodeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedeemCodeConfigError";
  }
}

export function normalizeRedeemCode(code: string) {
  return code.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function generateRedeemCode() {
  const bytes = new Uint8Array(CODE_GROUPS * CODE_GROUP_LENGTH);
  crypto.getRandomValues(bytes);

  const chars = Array.from(bytes, (byte) => {
    return CODE_ALPHABET[byte % CODE_ALPHABET.length];
  });
  const groups = Array.from({ length: CODE_GROUPS }, (_, index) => {
    const start = index * CODE_GROUP_LENGTH;
    return chars.slice(start, start + CODE_GROUP_LENGTH).join("");
  });

  return `${CODE_PREFIX}-${groups.join("-")}`;
}

export async function hashRedeemCode(env: CloudflareEnv, code: string) {
  return hashWithRedeemPepper(env, normalizeRedeemCode(code));
}

export async function hashWithRedeemPepper(env: CloudflareEnv, value: string) {
  const pepper = env.REDEEM_CODE_PEPPER;
  if (!pepper) {
    throw new RedeemCodeConfigError("REDEEM_CODE_PEPPER is not configured");
  }

  const data = new TextEncoder().encode(`${pepper}:${value}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToHex(hash);
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
