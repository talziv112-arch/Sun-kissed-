// Password hashing using the built-in Web Crypto API (no external dependency).
// Each user gets a random salt; we store `salt:hash`. PBKDF2-SHA256.
//
// NOTE: In a pure client-only Firebase app, verification happens after reading
// the user document. Lock your Firestore rules so password hashes are never
// world-readable (see firestore.rules). For maximum hardening, move auth to a
// Cloud Function. This implementation keeps passwords salted + iterated rather
// than stored in plaintext.

const ITERATIONS = 150_000;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSaltHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function derive(password: string, saltHex: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "האתר חייב לרוץ על חיבור מאובטח (HTTPS) או על localhost כדי לאמת סיסמאות."
    );
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const salt = Uint8Array.from(
    saltHex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16))
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomSaltHex();
  const hash = await derive(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = await derive(password, salt);
  // constant-ish time compare
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
