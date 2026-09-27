/**
 * Account Aggregator payload crypto, in Node, for Vercel (which can't run
 * the Java fiu-crypto-lib).
 *
 * Scheme (FIU module guide §6, ReBIT/Sahamati "Rahasya"):
 *   shared = ECDH(our private key, FIP public key) on curve25519
 *   xor    = ourNonce XOR fipNonce            (32 bytes each)
 *   salt   = xor[0..20), iv = xor[20..32)
 *   key    = HKDF-SHA256(shared, salt, info = empty, 32 bytes)
 *   plain  = AES-256-GCM(key, iv).decrypt(ciphertext ‖ 16-byte tag)
 *
 * Anumati's fiu-crypto-lib.jar (com.anumati.cryptolib.AaCrypto) uses
 * BouncyCastle "EC"/"ECDH" keys on "curve25519" in Weierstrass form, PEM
 * encoded with OID 1.3.6.1.4.1.3029.1.5.1. Node has no such curve, so the
 * scalar multiplication below is done with BigInt; the ECDH secret is the
 * Weierstrass x coordinate. RFC 7748 X25519 keys (OID 1.3.101.110) are also
 * accepted, via Node's native X25519.
 *
 * VERIFIED against the jar on 27 Sep 2026 in both directions
 * (`node scripts/aa-crosscheck.mjs <jar>`): the jar decrypts Node output,
 * accepts Node-generated keys, and Node decrypts jar-format payloads.
 *
 * No imports with path aliases and no "server-only" here, so the local mock
 * and check scripts can import this file directly.
 */
import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject,
} from "node:crypto";

/* --------------------------- curve25519 (Weierstrass) -------------------- */

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const THREE = BigInt(3);
const NINE = BigInt(9);
const TWENTY_SEVEN = BigInt(27);

// Wei25519: derived from the Montgomery curve y² = x³ + 486662x² + x so no
// constant can be mistyped. a = (3 − M²)/3, b = (2M³ − 9M)/27, x = u + M/3.
const P = TWO ** BigInt("255") - BigInt("19");
const M = BigInt("486662");
const N =
  TWO ** BigInt("252") + BigInt("27742317777372353535851937790883648493");
/** Montgomery A/3 mod p: Weierstrass x = Montgomery u + A/3. */
export const MONTGOMERY_SHIFT = mod(M * modInv(THREE));
const A = mod((THREE - M * M) * modInv(THREE));
const B = mod((TWO * M ** THREE - NINE * M) * modInv(TWENTY_SEVEN));
const GX = mod(NINE + MONTGOMERY_SHIFT);
const GY = BigInt(
  "0x20ae19a1b8a086b4e01edd2c7748d14c923d4d7e6d7c61b229e9c5a27eced3d9",
);

type Point = { x: bigint; y: bigint } | null; // null = point at infinity

function mod(a: bigint): bigint {
  const r = a % P;
  return r >= ZERO ? r : r + P;
}

function modInv(a: bigint): bigint {
  // Fermat: a^(p-2) mod p
  let result = ONE;
  let base = ((a % P) + P) % P;
  let e = P - TWO;
  while (e > ZERO) {
    if (e & ONE) result = (result * base) % P;
    base = (base * base) % P;
    e >>= ONE;
  }
  return result;
}

function add(p1: Point, p2: Point): Point {
  if (!p1) return p2;
  if (!p2) return p1;
  let lambda: bigint;
  if (p1.x === p2.x) {
    if (mod(p1.y + p2.y) === ZERO) return null;
    lambda = mod((THREE * p1.x * p1.x + A) * modInv(TWO * p1.y));
  } else {
    lambda = mod((p2.y - p1.y) * modInv(p2.x - p1.x));
  }
  const x = mod(lambda * lambda - p1.x - p2.x);
  return { x, y: mod(lambda * (p1.x - x) - p1.y) };
}

export function weierstrassMultiply(k: bigint, point: Point): Point {
  let result: Point = null;
  let addend = point;
  let n = k;
  while (n > ZERO) {
    if (n & ONE) result = add(result, addend);
    addend = add(addend, addend);
    n >>= ONE;
  }
  return result;
}

function onCurve({ x, y }: { x: bigint; y: bigint }): boolean {
  return mod(y * y) === mod(x * x * x + A * x + B);
}

export const WEIERSTRASS_G = { x: GX, y: GY };

/* ------------------------------ tiny DER reader -------------------------- */

interface Tlv {
  tag: number;
  value: Buffer;
}

function readTlvs(buf: Buffer): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i < buf.length) {
    const tag = buf[i++];
    let len = buf[i++];
    if (len & 0x80) {
      const bytes = len & 0x7f;
      len = 0;
      for (let j = 0; j < bytes; j++) len = (len << 8) | buf[i++];
    }
    out.push({ tag, value: buf.subarray(i, i + len) });
    i += len;
  }
  return out;
}

/** Depth-first list of every TLV (constructed ones are opened). */
function walk(buf: Buffer, acc: Tlv[] = []): Tlv[] {
  for (const tlv of readTlvs(buf)) {
    acc.push(tlv);
    const constructed = (tlv.tag & 0x20) !== 0;
    if (constructed) walk(tlv.value, acc);
    // An OCTET STRING that holds a DER structure (PKCS#8 private key body).
    if (tlv.tag === 0x04 && tlv.value[0] === 0x30) {
      try {
        walk(tlv.value, acc);
      } catch {
        /* not DER inside */
      }
    }
  }
  return acc;
}

const X25519_OID = Buffer.from([0x2b, 0x65, 0x6e]); // 1.3.101.110

function toDer(key: string): Buffer {
  const trimmed = key.trim();
  if (trimmed.includes("-----BEGIN")) {
    const body = trimmed
      .replace(/-----BEGIN [^-]+-----/, "")
      .replace(/-----END [^-]+-----/, "")
      .replace(/\s+/g, "");
    return Buffer.from(body, "base64");
  }
  return Buffer.from(trimmed.replace(/\s+/g, ""), "base64");
}

function isX25519(der: Buffer): boolean {
  return walk(der).some((t) => t.tag === 0x06 && t.value.equals(X25519_OID));
}

function pemOf(der: Buffer, label: "PUBLIC KEY" | "PRIVATE KEY"): string {
  const b64 = der.toString("base64").replace(/(.{64})/g, "$1\n");
  return `-----BEGIN ${label}-----\n${b64.trim()}\n-----END ${label}-----\n`;
}

function bigFrom(bytes: Buffer): bigint {
  return bytes.length ? BigInt(`0x${bytes.toString("hex")}`) : ZERO;
}

function bytes32(n: bigint): Buffer {
  return Buffer.from(n.toString(16).padStart(64, "0"), "hex");
}

/** Weierstrass public point from an EC SubjectPublicKeyInfo (or raw point). */
function weierstrassPublic(der: Buffer): { x: bigint; y: bigint } {
  let point: Buffer | null = null;
  if (der.length === 65 && der[0] === 0x04) point = der;
  else {
    const bitString = walk(der).find((t) => t.tag === 0x03);
    if (bitString) point = bitString.value.subarray(1); // skip unused-bits byte
  }
  if (!point || point.length !== 65 || point[0] !== 0x04) {
    throw new Error("Unsupported curve25519 public key encoding");
  }
  const pub = {
    x: bigFrom(point.subarray(1, 33)),
    y: bigFrom(point.subarray(33, 65)),
  };
  if (!onCurve(pub)) throw new Error("Public key is not on curve25519");
  return pub;
}

/** Private scalar from PKCS#8 / SEC1 EC private key (or raw 32 bytes). */
function weierstrassPrivate(der: Buffer): bigint {
  if (der.length === 32) return bigFrom(der);
  // SEC1 ECPrivateKey: SEQUENCE { INTEGER 1, OCTET STRING d, ... }
  const scalar = walk(der).find(
    (t) => t.tag === 0x04 && t.value.length >= 31 && t.value.length <= 33,
  );
  if (scalar) return bigFrom(scalar.value);
  throw new Error("Unsupported curve25519 private key encoding");
}

/* ------------------------------ public API ------------------------------- */

/** ECDH shared secret (32 bytes) for either key encoding. */
export function sharedSecret(ourPrivateKey: string, theirPublicKey: string) {
  const privDer = toDer(ourPrivateKey);
  const pubDer = toDer(theirPublicKey);
  if (isX25519(privDer) || isX25519(pubDer)) {
    return diffieHellman({
      privateKey: createPrivateKey({
        key: privDer,
        format: "der",
        type: "pkcs8",
      }),
      publicKey: createPublicKey({ key: pubDer, format: "der", type: "spki" }),
    });
  }
  const shared = weierstrassMultiply(
    weierstrassPrivate(privDer),
    weierstrassPublic(pubDer),
  );
  if (!shared) throw new Error("ECDH produced the point at infinity");
  return bytes32(shared.x);
}

function sessionKey(shared: Buffer, ourNonce: string, theirNonce: string) {
  const a = Buffer.from(ourNonce, "base64");
  const b = Buffer.from(theirNonce, "base64");
  if (a.length !== b.length || a.length < 32) {
    throw new Error("Nonces must be the same length (32 bytes)");
  }
  const xor = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) xor[i] = a[i] ^ b[i];
  const salt = xor.subarray(0, 20);
  const iv = xor.subarray(xor.length - 12);
  const key = Buffer.from(
    hkdfSync("sha256", shared, salt, Buffer.alloc(0), 32),
  );
  return { key, iv };
}

export interface DecryptInput {
  ourPrivateKey: string;
  ourNonce: string;
  fipPublicKey: string;
  fipNonce: string;
  encryptedFI: string;
}

export function decryptFI(input: DecryptInput): string {
  const shared = sharedSecret(input.ourPrivateKey, input.fipPublicKey);
  const { key, iv } = sessionKey(shared, input.ourNonce, input.fipNonce);
  const data = Buffer.from(input.encryptedFI, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([
    decipher.update(data.subarray(0, data.length - 16)),
    decipher.final(),
  ]).toString("utf8");
}

/** Used by the local mock FIP and by tests. */
export function encryptFI(input: {
  fipPrivateKey: string;
  fipNonce: string;
  ourPublicKey: string;
  ourNonce: string;
  plaintext: string;
}): string {
  const shared = sharedSecret(input.fipPrivateKey, input.ourPublicKey);
  const { key, iv } = sessionKey(shared, input.ourNonce, input.fipNonce);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(input.plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([body, cipher.getAuthTag()]).toString("base64");
}

export interface KeyMaterialPair {
  privateKeyPem: string;
  publicKeyPem: string;
  nonce: string;
}

/**
 * A fresh key pair + nonce. "weierstrass" matches the Java Rahasya format;
 * "x25519" is RFC 7748. Which one the FIU module expects on
 * /module/initiate/fetch is confirmed against `fiu-crypto-lib --genkey`.
 */
export function generateKeyMaterial(
  encoding: "weierstrass" | "x25519" = "weierstrass",
): KeyMaterialPair {
  const nonce = randomBytes(32).toString("base64");
  if (encoding === "x25519") {
    const { privateKey, publicKey } = generateKeyPairSync("x25519");
    return {
      privateKeyPem: (privateKey as KeyObject)
        .export({ format: "pem", type: "pkcs8" })
        .toString(),
      publicKeyPem: (publicKey as KeyObject)
        .export({ format: "pem", type: "spki" })
        .toString(),
      nonce,
    };
  }
  let d = ZERO;
  while (d === ZERO) d = bigFrom(randomBytes(32)) % N;
  const q = weierstrassMultiply(d, WEIERSTRASS_G);
  if (!q) throw new Error("Key generation failed");
  // SPKI with explicit OID-less algorithm id is not portable, so the raw
  // point is wrapped in a minimal EC SPKI using id-ecPublicKey and the
  // cryptlib curve25519 OID (1.3.6.1.4.1.3029.1.5.1), as BouncyCastle does.
  const point = Buffer.concat([
    Buffer.from([0x04]),
    bytes32(q.x),
    bytes32(q.y),
  ]);
  const algId = Buffer.from(
    "3015" + "06072a8648ce3d0201" + "060a2b060104019755010501",
    "hex",
  );
  const bitString = Buffer.concat([Buffer.from([0x03, 0x42, 0x00]), point]);
  const spkiBody = Buffer.concat([algId, bitString]);
  const spki = Buffer.concat([Buffer.from([0x30, spkiBody.length]), spkiBody]);
  // SEC1 inside PKCS#8
  const sec1Body = Buffer.concat([
    Buffer.from([0x02, 0x01, 0x01, 0x04, 0x20]),
    bytes32(d),
  ]);
  const sec1 = Buffer.concat([Buffer.from([0x30, sec1Body.length]), sec1Body]);
  const pkcs8Body = Buffer.concat([
    Buffer.from([0x02, 0x01, 0x00]),
    algId,
    Buffer.from([0x04, sec1.length]),
    sec1,
  ]);
  const pkcs8 = Buffer.concat([
    Buffer.from([0x30, pkcs8Body.length]),
    pkcs8Body,
  ]);
  return {
    privateKeyPem: pemOf(pkcs8, "PRIVATE KEY"),
    publicKeyPem: pemOf(spki, "PUBLIC KEY"),
    nonce,
  };
}
