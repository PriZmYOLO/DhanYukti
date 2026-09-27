#!/usr/bin/env node
/**
 * Proves lib/server/aa/crypto.ts matches Anumati's fiu-crypto-lib.jar, in
 * both directions. Needs Java 21 and the jar (NOT committed; Perfios sends it
 * to participants — rename fiu-crypto-lib.txt to .jar).
 *
 *   node scripts/aa-crosscheck.mjs /path/to/fiu-crypto-lib.jar
 *   node scripts/aa-crosscheck.mjs /path/to/jar /path/to/getdata.json
 *     (second form: decrypt a real saved UAT get-data response with both the
 *      jar and Node and compare the output)
 *
 * Last run 27 Sep 2026: all passed. A Java harness calling
 * AaCrypto.encryptAsFip (jar encrypts as the bank) was also decrypted by
 * Node byte-for-byte.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  decryptFI,
  encryptFI,
  generateKeyMaterial,
} from "../src/lib/server/aa/crypto.ts";

const [jar, saved] = process.argv.slice(2);
if (!jar) {
  console.error(
    "Usage: node scripts/aa-crosscheck.mjs <fiu-crypto-lib.jar> [getdata.json]",
  );
  process.exit(2);
}
const dir = mkdtempSync(path.join(tmpdir(), "aa-xcheck-"));
const java = (...args) =>
  execFileSync("java", ["-jar", jar, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};

if (saved) {
  const body = JSON.parse(readFileSync(saved, "utf8"));
  const jarOut = JSON.parse(java("--getdata", saved));
  const esc = body.uatKeyMaterial;
  body.sessions.forEach((s, i) => {
    if (!s.encryptedFI) return;
    const node = decryptFI({
      ourPrivateKey: esc.privateKey,
      ourNonce: esc.nonce,
      fipPublicKey: s.fipKeyMaterial.DHPublicKey.KeyValue,
      fipNonce: s.fipKeyMaterial.Nonce,
      encryptedFI: s.encryptedFI,
    });
    check(
      `saved payload, account ${i + 1}`,
      JSON.stringify(JSON.parse(node)) === JSON.stringify(jarOut[i].data),
    );
  });
} else {
  const plain = JSON.stringify({
    Account: {
      maskedAccNumber: "XXXX9648",
      Summary: { currentBalance: "12345.67" },
    },
  });

  // 1. Jar-generated FIU keys (as in UAT escrow), Node encrypts as the FIP, jar decrypts.
  const jk = JSON.parse(java("--genkey"));
  const fip = generateKeyMaterial("weierstrass");
  const payload = {
    sessions: [
      {
        fipId: "FIP-1",
        encryptedFI: encryptFI({
          fipPrivateKey: fip.privateKeyPem,
          fipNonce: fip.nonce,
          ourPublicKey: jk.publicKey,
          ourNonce: jk.nonce,
          plaintext: plain,
        }),
        fipKeyMaterial: {
          Nonce: fip.nonce,
          DHPublicKey: { KeyValue: fip.publicKeyPem },
        },
      },
    ],
    uatKeyMaterial: { privateKey: jk.privateKey, nonce: jk.nonce },
  };
  writeFileSync(path.join(dir, "a.json"), JSON.stringify(payload));
  const out = JSON.parse(java("--getdata", path.join(dir, "a.json")));
  check(
    "Node encrypts → jar decrypts (jar keys)",
    JSON.stringify(out[0].data) === plain,
  );

  // 2. Node-generated FIU keys are accepted by the jar (PERIODIC re-fetch keys).
  const ours = generateKeyMaterial("weierstrass");
  const fip2 = generateKeyMaterial("weierstrass");
  writeFileSync(path.join(dir, "k.pem"), ours.privateKeyPem);
  writeFileSync(
    path.join(dir, "b.json"),
    JSON.stringify({
      sessions: [
        {
          encryptedFI: encryptFI({
            fipPrivateKey: fip2.privateKeyPem,
            fipNonce: fip2.nonce,
            ourPublicKey: ours.publicKeyPem,
            ourNonce: ours.nonce,
            plaintext: plain,
          }),
          fipKeyMaterial: {
            Nonce: fip2.nonce,
            DHPublicKey: { KeyValue: fip2.publicKeyPem },
          },
        },
      ],
    }),
  );
  const out2 = JSON.parse(
    java(
      "--getdata",
      path.join(dir, "b.json"),
      "--private-key",
      path.join(dir, "k.pem"),
      "--our-nonce",
      ours.nonce,
    ),
  );
  check(
    "Node-generated keys → jar decrypts",
    JSON.stringify(out2[0].data) === plain,
  );

  // 3. Jar keys on both sides, Node decrypts (the production direction).
  const fipJar = JSON.parse(java("--genkey"));
  const fiuJar = JSON.parse(java("--genkey"));
  // The CLI has no encrypt command, so Node plays the FIP with the jar's FIP
  // key; decryption uses only jar-format keys end to end.
  const ct = encryptFI({
    fipPrivateKey: fipJar.privateKey,
    fipNonce: fipJar.nonce,
    ourPublicKey: fiuJar.publicKey,
    ourNonce: fiuJar.nonce,
    plaintext: plain,
  });
  const back = decryptFI({
    ourPrivateKey: fiuJar.privateKey,
    ourNonce: fiuJar.nonce,
    fipPublicKey: fipJar.publicKey,
    fipNonce: fipJar.nonce,
    encryptedFI: ct,
  });
  check("jar-format keys both sides → Node round trip", back === plain);
}
process.exit(failures ? 1 : 0);
