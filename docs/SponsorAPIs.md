# Sponsor APIs: Anumati (Perfios AA) + Perfios

Researched 2026-09-26. Owner: docs. Code lives in `api/` and `web/`; this file only says **what to call**.

**Confidence tags** (every endpoint has one):

| Tag | Meaning |
|---|---|
| **VERIFIED** | Read in an official public source: the ReBIT spec PDF, a Sahamati page, a Sahamati GitHub repo, or perfios.ai |
| **INFERRED** | Taken from the ReBIT standard plus another AA's public v2.0.0 docs (Saafe, Finvu). Anumati must follow ReBIT, so it should match, but Anumati's own docs are not public |
| **UNVERIFIED** | From memory, secondary sites, or the brief. **Check it against the sandbox docs that come by email before you write code** |

> Bottom line: Anumati and Perfios do **not** publish public API references. The paths and methods on the **AA side** are fixed by ReBIT, so they are safe to build against. **Everything on the Perfios side (BSA, Hub/KYC, FIU gateway) is UNVERIFIED** until the sponsor's docs or Postman collection arrive.

---

## 1. Summary: every API we plan to use

DhanYukti stages: **Consent** (user approves data sharing) → **Connect** (we pull the FI data) → **Understand** (we analyse and categorise) → **Trust** (we verify household facts and assets).

| # | API | Provider | Method + Path | Stage | Confidence |
|---|---|---|---|---|---|
| A1 | Create consent request | Anumati | `POST /Consent` | Consent | VERIFIED (path), INFERRED (body) |
| A2 | Consent status by handle | Anumati | v2: `POST /Consent/handle` · v1.1.x: `GET /Consent/handle/{handle}` | Consent | VERIFIED (v2 path) / INFERRED (v1) |
| A3 | Fetch consent artefact | Anumati | v2: `POST /Consent/fetch` · v1.1.x: `GET /Consent/{id}` | Consent | VERIFIED (v2 path) / INFERRED (v1) |
| A4 | Revoke / update consent status | Anumati | `POST /Consent/Notification` (FIU → AA) | Consent | VERIFIED (path + purpose), INFERRED (revoke semantics) |
| A5 | Consent status callback | **DhanYukti hosts it** | `POST {our-base}/Consent/Notification` | Consent | VERIFIED |
| A6 | FI data request | Anumati | `POST /FI/request` | Connect | VERIFIED (path), INFERRED (body) |
| A7 | FI data status callback | **DhanYukti hosts it** | `POST {our-base}/FI/Notification` | Connect | VERIFIED |
| A8 | FI data fetch | Anumati | v2: `POST /FI/fetch` · v1.1.x: `GET /FI/fetch/{sessionId}` | Connect | VERIFIED (v2 path) / INFERRED (v1) |
| A9 | Heartbeat | Anumati | `GET /Heartbeat` | Ops | VERIFIED |
| A10 | Account discovery and linking | Anumati UI (AA's own screen) | Redirect or webview, **not our API** | Consent | VERIFIED (spec says this must happen between the customer and the AA) |
| C1 | ECDH key generation / decrypt | Sahamati `rahasya` (runs locally) | `GET /ecc/v1/generateKey`, `POST /ecc/v1/decrypt` | Connect | VERIFIED (source code) |
| C2 | Central Registry / token service | Sahamati | `GET /v2/entityInfo/{type}`, `POST /iam/v1/entity/token/generate` | Auth | VERIFIED (Sahamati dev docs), probably handled by Anumati/Perfios in sandbox |
| P1 | FIU gateway (FIU++ / Fin360) | Perfios | unknown, not public | Connect | UNVERIFIED |
| P2 | BSA: initiate transaction | Perfios | `POST .../transactions` | Understand | UNVERIFIED |
| P3 | BSA: upload statement | Perfios | `POST .../transactions/{perfiosTxnId}/bank-statements` | Understand | UNVERIFIED |
| P4 | BSA: complete / process | Perfios | `POST .../transactions/{perfiosTxnId}/process` | Understand | UNVERIFIED |
| P5 | BSA: retrieve report (with categorised txns) | Perfios | `GET .../transactions/{perfiosTxnId}/reports?types=json` | Understand | UNVERIFIED |
| P6 | BSA: completion callback | **DhanYukti hosts it** | `POST {our-base}/perfios/callback` | Understand | UNVERIFIED |
| P7 | Categorisation / analytics on AA data | Perfios | Probably the P2–P5 flow with an AA source; not public | Understand | UNVERIFIED |
| H1 | Electricity bill authentication | Perfios Hub | unknown | Trust | UNVERIFIED |
| H2 | Vehicle RC (advanced) | Perfios Hub | unknown | Trust | UNVERIFIED (Hub lists "RC Verification") |
| H3 | Ration card details | Perfios Hub | unknown | Trust | UNVERIFIED |
| H4 | EPF / UAN passbook (OTP) | Perfios Hub | unknown | Trust | UNVERIFIED (Perfios blog confirms the product exists) |
| H5 | DigiLocker documents | Perfios Hub | unknown | Trust | UNVERIFIED (Hub lists "Digilocker-based Verification") |

---

## 2. Anumati / ReBIT AA

### 2.1 Facts

| Item | Value | Source | Tag |
|---|---|---|---|
| Brand / legal entity | Anumati is a brand of **Perfios Account Aggregation Services Pvt Ltd** (RBI NBFC-AA). The brief says "Perfios Account Aggregator Pvt Ltd"; use the name from the sponsor's email | https://www.anumati.co.in/ | VERIFIED |
| Spec | ReBIT NBFC-AA API Specification **v2.0.0** (9 Aug 2023); v1.1 dates from 8 Nov 2019 | https://specifications.rebit.org.in/artefacts/NBFC-AA_API_Specification_v2.0.0.pdf | VERIFIED |
| Spec index / schemas | https://api.rebit.org.in/ (Swagger UI, loads with JS). Contact: aa-api@rebit.org.in | same | VERIFIED |
| Architecture | Asynchronous. The AA calls back to the FIU's `/Consent/Notification` and `/FI/Notification`. Polling is a fallback | ReBIT PDF §I | VERIFIED |
| Anumati base URL / sandbox host | **Not public** | none | Get it from the sponsor |

### 2.2 v2.0.0 vs v1.1.x paths

ReBIT v2.0.0 replaced the GET path-param calls with **POST + JSON body**. **Ask Anumati which version their sandbox serves** (see Open Questions).

| Operation | v2.0.0 (VERIFIED, ReBIT PDF) | v1.1.x (INFERRED, Finvu sandbox docs) |
|---|---|---|
| Create consent | `POST /Consent` | `POST /Consent` |
| Consent status | `POST /Consent/handle` body `{ConsentHandle}` | `GET /Consent/handle/{consentHandle}` |
| Consent artefact | `POST /Consent/fetch` body `{consentId}` | `GET /Consent/{id}` |
| FI request | `POST /FI/request` | `POST /FI/request` |
| FI fetch | `POST /FI/fetch` body `{sessionId, fipId?, linkRefNumber[]?}` | `GET /FI/fetch/{sessionId}` |
| Status push to AA (e.g. revoke) | `POST /Consent/Notification` | `POST /Consent/Notification` |
| Heartbeat | `GET /Heartbeat` | `GET /Heartbeat` |

### 2.3 Endpoint details (AA-hosted; we call these)

Every body carries the envelope `ver`, `timestamp` (ISO-8601 UTC, ms), `txnid` (UUIDv4, ours, unique per call). Every call is signed with `x-jws-signature` (see §4).

| API | Purpose | Key request fields | Key response fields | Source | Tag |
|---|---|---|---|---|---|
| `POST /Consent` | Ask the AA to create a consent request for a customer. The customer approves it on Anumati's screen. | `ConsentDetail.{consentStart, consentExpiry, consentMode, fetchType, consentTypes[], fiTypes[], DataConsumer.{id,type:"FIU"}, Customer.Identifiers[{type:"MOBILE",value}]` (v2) or `Customer.id:"<mobile>@<aa-handle>"` (v1), `Purpose.{code, refUri, text, Category.type}`, `FIDataRange.{from,to}`, `DataLife.{unit,value}`, `Frequency.{unit,value}`, optional `DataFilter[]`} | `ConsentHandle`, `Customer.id` (VUA) | ReBIT PDF; https://docs.saafe.in/fiu-module/aa-api-v2.0.0 | Path VERIFIED, body INFERRED |
| `POST /Consent/handle` | Poll whether the user approved | `ConsentHandle` | `ConsentHandle`, `ConsentStatus.{id (= consentId once approved), status}` | same | Path VERIFIED, body INFERRED |
| `POST /Consent/fetch` | Get the signed consent artefact (we need its signature for FI/request) | `consentId` | `consentId`, `status`, `createTimestamp`, `signedConsent` (JWS; decode the payload to see the approved accounts: `Accounts[].{fipId, linkRefNumber, maskedAccNumber, fiType, accType}`), `ConsentUse.{logUri, count, lastUseDateTime}` | same | Path VERIFIED, body INFERRED |
| `POST /FI/request` | Start a data pull session under an ACTIVE consent | `FIDataRange.{from,to}` (inside the consent range), `Consent.{id, digitalSignature}` (**digitalSignature = the 3rd segment of `signedConsent`**), `KeyMaterial.{cryptoAlg:"ECDH", curve:"Curve25519", params, DHPublicKey.{expiry, Parameters, KeyValue}, Nonce}` | `consentId`, `sessionId` | same | Path VERIFIED, body INFERRED |
| `POST /FI/fetch` | Download the encrypted FI once the AA says it's READY | `sessionId`, optional `fipId`, `linkRefNumber[{id}]` | `FI[].{fipID, data[].{linkRefNumber, maskedAccNumber, encryptedFI}, KeyMaterial.{..., DHPublicKey.KeyValue, Nonce}}`: the **FIP's** key and nonce for decryption | same | Path VERIFIED, body INFERRED |
| `POST /Consent/Notification` (FIU → AA) | Tell the AA about a consent status change. This is the documented way for an FIU to revoke ("used by AA Client, FIU and FIP to place a request for consent status update to AA") | `Notifier.{type:"FIU", id}`, `ConsentStatusNotification.{consentId, consentHandle, consentStatus:"REVOKED"}` | `response:"OK"` | ReBIT PDF p.6 | Path VERIFIED, revoke payload INFERRED. **Confirm with Anumati**; many AAs only allow revoke from their own app |
| `GET /Heartbeat` | Health check | none | `Status: "UP"` | ReBIT PDF p.7 | VERIFIED |

**Status enums** (INFERRED, ReBIT/Finvu/Saafe): consent `PENDING | ACTIVE | PAUSED | REVOKED | EXPIRED | REJECTED` (the Saafe handle response returns `APPROVED` for handle status); FI session `ACTIVE | PENDING | COMPLETED | EXPIRED | FAILED | PARTIAL`; per-account FIStatus `READY | DENIED | PENDING | DELIVERED | TIMEOUT`.

### 2.4 FIU-hosted callbacks (we host; Anumati calls us)

| API | Purpose | Body | Our response | Tag |
|---|---|---|---|---|
| `POST {our-base}/Consent/Notification` | Consent approved, rejected, revoked, paused or expired | `Notifier.{type:"AA", id}`, `ConsentStatusNotification.{consentId, consentHandle, consentStatus}` | `{ver, timestamp, txnid (echo), response:"OK"}`, **signed** with `x-jws-signature` | VERIFIED (ReBIT PDF p.11); body INFERRED (Saafe) |
| `POST {our-base}/FI/Notification` | Data ready or failed per account | `FIStatusNotification.{sessionId, sessionStatus, FIStatusResponse[].{fipID, Accounts[].{linkRefNumber, FIStatus, description}}}` | same as above | VERIFIED / INFERRED |

Callback rules: **verify the AA's `x-jws-signature` against the raw body before JSON-parsing it**, using the AA public key from the Central Registry or a key the sponsor gives us. The AA also sends an API-key header (Saafe calls it `aa_api_key`), so check that too. Make the handler idempotent on `txnid`.

### 2.5 Account discovery and linking

Discovery, linking and consent approval happen **on Anumati's screen, never ours** (ReBIT: "All the interactions of account linking, and consent management must happen directly between the Customer and the AA"). After `POST /Consent` we redirect the user or open a webview to Anumati with the `ConsentHandle`. Most AAs use an encrypted redirect (`ecreq`, `reqdate`, `fi` query params, AES-encrypted with an AA-issued key). **Anumati's redirect format is UNVERIFIED, so ask for it.**

### 2.6 Sample consent request for DhanYukti (v2.0.0)

**Purpose code:** Sahamati's list (https://sahamati.org.in/purpose-codes/, VERIFIED):

| Code | Category | Text |
|---|---|---|
| 101 | Personal Finance | Wealth management service |
| **102** | **Personal Finance** | **Customer spending patterns, budget or other reportings** |
| 103 | Financial Reporting | Aggregated statement |
| 104 / 105 | Account Query and Monitoring | Monitoring / one-time consent |

**Recommendation: use `102`, not 101.** Sahamati's PFM fair-use template **CT008** (https://sahamati.org.in/aa-fair-use-template-library/consent-template-id-ct008-personal-finance-management/, VERIFIED) uses code 102 and allows DEPOSIT, RECURRING_DEPOSIT and INSURANCE_POLICIES; PROFILE/SUMMARY/TRANSACTIONS; PERIODIC fetch; up to 45 fetches a month; up to 13 months of data range for non-SEBI FI types; up to 1 year validity; up to 1 month data life. Our parameters are inside all of those limits. Switch to 101 only if we pitch "wealth management". CT008 purpose text: *"To generate insights based on your overall finances and provide incidental recommendations, if any."*

Dates below assume the request is sent on 2026-09-26: data range is the last 6 months, expiry is +90 days.

```json
{
  "ver": "2.0.0",
  "timestamp": "2026-09-26T10:00:00.000Z",
  "txnid": "0b6c7c7e-6f0e-4a8e-9d57-3b1c8f0e2a11",
  "ConsentDetail": {
    "consentStart": "2026-09-26T10:00:00.000Z",
    "consentExpiry": "2026-12-25T10:00:00.000Z",
    "consentMode": "STORE",
    "fetchType": "PERIODIC",
    "consentTypes": ["TRANSACTIONS", "PROFILE", "SUMMARY"],
    "fiTypes": ["DEPOSIT", "RECURRING_DEPOSIT", "INSURANCE_POLICIES"],
    "DataConsumer": { "id": "${FIU_ID}", "type": "FIU" },
    "Customer": {
      "Identifiers": [{ "type": "MOBILE", "value": "${CUSTOMER_MOBILE}" }]
    },
    "Purpose": {
      "code": "102",
      "refUri": "https://api.rebit.org.in/aa/purpose/102.xml",
      "text": "To generate insights based on your overall finances and provide incidental recommendations, if any",
      "Category": { "type": "Personal Finance" }
    },
    "FIDataRange": {
      "from": "2026-03-26T00:00:00.000Z",
      "to": "2026-09-26T00:00:00.000Z"
    },
    "DataLife": { "unit": "DAY", "value": 1 },
    "Frequency": { "unit": "MONTH", "value": 1 }
  }
}
```

v1.1.x variant: set `"ver": "1.1.2"` (or whatever version Anumati uses) and replace `Customer.Identifiers` with `"Customer": { "id": "${CUSTOMER_MOBILE}@anumati" }`. The `@anumati` handle suffix is UNVERIFIED, so ask for it. Also note:
- `DataLife 1 DAY` means we must delete the raw FI within 24h of fetching and keep only derived insights. That's good for privacy, but the design has to allow for it (see Security.md).
- `Frequency 1 MONTH` allows **one** fetch per month. Don't retry-loop `/FI/request` in the demo, or you'll use up the quota; the AA will reject the extra calls.

---

## 3. Perfios

> Perfios publishes marketing pages, not API references. **Every Perfios endpoint here is UNVERIFIED** and is only a starting shape for when the sandbox docs arrive.

### 3.1 What exists (VERIFIED from perfios.ai)

| Product | What it is | Source |
|---|---|---|
| FIU++ / Fin360 ("FIU Gateway") | TSP module for FIUs. "Pre-integrated with Sahamati's Central Registry and Token Server", does ReBIT "encryption & decryption of data and schema contract validations", "pre-built integrations with Perfios' analytics engine", auto-fetch and bulk-fetch | https://perfios.ai/in/products/fiu/ |
| Bank Statement Analyser | PDF/scan statement → categorised transactions, income, obligations, fraud flags. Reports in JSON, Excel and PDF | https://www.perfios.com/solutions/bank-statement-analyzer |
| Perfios Hub | Self-serve API marketplace: signup at **hub.perfios.ai** (`/app/register`), "unlimited sandbox", 10k+ free credits, Postman collections, "security key based" auth. Lists RC Verification, Bank Statement Analysis, Digilocker-based Verification, Employment Verification, Address Verification, ITR and more | https://perfios.ai/in/products/perfios-hub/ , https://perfios.ai/resources/blogs/how-to-integrate-kyc-api/ |
| EPFO Passbook | UAN + OTP → PF contributions, withdrawals, employer history | https://perfios.ai/resources/blogs/utilizing-epf-verification-api-for-employee-benefits-management/ |

### 3.2 FIU gateway (P1): if the sponsor gives us Perfios FIU++ instead of raw AA access

If they do, **we don't call §2 directly**. Perfios wraps consent creation, the FI request/fetch and the decryption, and probably returns decrypted JSON plus analytics. All paths are UNVERIFIED. Ask which mode we're in: **raw ReBIT against Anumati, or the Perfios FIU++ wrapper**. That one answer decides about half of the backend work.

### 3.3 Bank Statement Analysis (P2–P6): all UNVERIFIED

Shape based on Perfios "Insights" v3 as it appears in partner integrations (e.g. HDFC's developer portal lists `perfios-passBookInitiateTrans`, `Passbook_UploadStatementFile` → fileId, `perfios-passBookRetrieveReport` "in XML and JSON format", and a `CL_PerfiosTransStats_Callback` with `perfiosTransactionId`).

| Step | Method + Path (guess) | Key request fields | Key response fields | Tag |
|---|---|---|---|---|
| P2 Initiate | `POST ${PERFIOS_BASE}/KuberaVault/insights/v3/${PERFIOS_ORG_ID}/transactions` | `txnId` (ours), `processingType:"STATEMENT"`, **`loanAmount`, `loanDuration`, `loanType`** (required even though we are not lending; send placeholders, e.g. `loanType:"Personal"`, `loanAmount:0` or `1`, `loanDuration:12`, and confirm acceptable values), `transactionCompleteCallbackUrl`, `yearMonthFrom`/`yearMonthTo`, `acceptancePolicy`, `uploadingScannedStatements` | `perfiosTransactionId` | UNVERIFIED |
| P3 Upload | `POST .../transactions/${PERFIOS_TXN_ID}/bank-statements` (multipart: `file`, `password`) | PDF, optional password, `institutionId` | `statementId`/`fileId` | UNVERIFIED (HDFC portal confirms that an upload API returns a file ID) |
| P4 Complete/process | `POST .../transactions/${PERFIOS_TXN_ID}/process` (older API: `/complete`) | none | 202 accepted | UNVERIFIED |
| P6 Callback | Perfios → `POST {our-base}/perfios/callback` | `perfiosTransactionId`, `clientTransactionId`, `status` (COMPLETED / ERROR), `errorCode` | 200 | UNVERIFIED (callback name from HDFC portal) |
| P5 Retrieve | `GET .../transactions/${PERFIOS_TXN_ID}/reports?types=json` (also xlsx, pdf) | none | Categorised `accountXns[]` (date, narration, amount, category, balance), monthly summaries (credits, debits, salary, EMI, bounces), `fcuAnalysis` (fraud) | UNVERIFIED |

**Why the loan fields matter:** BSA is an underwriting product, and initiation expects `loanAmount`, `loanDuration` and `loanType`. We are a PFM app, so ask the sponsor for accepted dummy values or a non-lending "purpose" profile.

**P7 analytics on AA data:** Perfios probably runs the same categoriser on AA data through FIU++ ("pre-built integrations with Perfios' analytics engine"). Ask whether we can send decrypted ReBIT FI XML/JSON to BSA, or whether FIU++ returns categorised output directly.

### 3.4 Perfios Hub / KYC (Trust stage): all UNVERIFIED

Perfios acquired Karza Technologies (2022), and many Hub KYC APIs are Karza-lineage. The paths below are hypotheses **only**. Use the Hub Postman collection.

| # | API | Purpose in DhanYukti | Likely inputs | Likely outputs | Tag |
|---|---|---|---|---|---|
| H1 | Electricity bill authentication | Proof of address and household utility spend (Tier 2/3 households often have no other formal records) | `consumerId`/`consumer_no`, `serviceProvider` (DISCOM code), consent flag | Consumer name, address, bill amount, due date, bill history | UNVERIFIED |
| H2 | RC (vehicle registration) advanced | Asset verification (two-wheeler or tractor ownership) | `registrationNumber`, consent | Owner name, vehicle class/model, reg date, insurance validity, financer/hypothecation, blacklist status | UNVERIFIED |
| H3 | Ration card details | Household composition, BPL/AAY status | `rationCardNumber`, `state` | Card type, head of family, member list | UNVERIFIED |
| H4 | EPF/UAN passbook | Formal-employment income and savings | Step 1: `uan` or `mobile` → OTP sent; Step 2: `requestId` + `otp` | Member/establishment IDs, monthly employee/employer contributions, balance | UNVERIFIED (Perfios blog confirms UAN + OTP flow) |
| H5 | DigiLocker | Pull issued docs (Aadhaar XML, PAN, DL, marksheets) with user OAuth consent | Step 1: create session → redirect URL; Step 2: callback with code; Step 3: list and fetch docs | Signed document XML/PDF, parsed fields | UNVERIFIED |

---

## 4. Auth, signing, encryption

### 4.1 Headers

| Hop | Header | Value | Source | Tag |
|---|---|---|---|---|
| FIU → AA | `Content-Type` | `application/json` | Finvu / Saafe docs | INFERRED |
| FIU → AA | `client_api_key` | AA-issued API key (Finvu: 6-month expiry in sandbox) | Saafe, Finvu | INFERRED (Anumati's name for it UNVERIFIED) |
| FIU → AA | `x-jws-signature` | Detached JWS of the exact body bytes | ReBIT / Finvu JWS lib | VERIFIED standard |
| FIU → AA (via Sahamati) | `Authorization: Bearer <entity token>` | Token from Sahamati IAM `POST https://api.sahamati.org.in/iam/v1/entity/token/generate` (24h validity) | https://developer.sahamati.org.in/llms-full.txt | VERIFIED for SahamatiNet; **probably not needed in Anumati sandbox**, so ask |
| FIU → AA | `x-request-meta` | Base64 request metadata (SahamatiNet router) | Sahamati dev docs | VERIFIED exists; probably not needed |
| AA → FIU | `x-jws-signature`, `aa_api_key` | We verify both | Saafe FIU docs | INFERRED |
| Perfios BSA | `X-Perfios-Algorithm: PERFIOS1-RSA-SHA256`, `X-Perfios-Date`, `X-Perfios-Content-Sha256`, `X-Perfios-Signed-Headers`, `X-Perfios-Signature`, `Host` | RSA-SHA256 signature over a canonical request (AWS-SigV4-like) using our private key | Memory / partner integrations | UNVERIFIED |
| Perfios Hub/KYC | One of: `x-auth-key`/`x-auth-secret`, **`secure-id` / `secure-credential` / `organisation-id`** (the brief's pattern), or Karza-style `x-karza-key` | Hub API key(s) | Hub says only "security key based" | UNVERIFIED |

### 4.2 JWS signing (ReBIT detached, RFC 7797)

Source: https://github.com/finvu/finvu-rebit-aa-jws (VERIFIED as the published convention).

| Rule | Detail |
|---|---|
| Protected header | `{"alg":"RS256","kid":"<our key id>","b64":false,"crit":["b64"]}` |
| Format | `base64url(header)..base64url(signature)`: **two dots, empty payload** |
| Signing input | `base64url(header) + "." + <raw body bytes>` (unencoded payload, since b64=false) |
| Send | Raw JSON in the body, signature in `x-jws-signature` |
| Verify | Verify **before** parsing JSON, over the exact received bytes. Re-serialising the JSON breaks the signature |
| Keys | RSA 2048 keypair. Share the public key (JWK with `kid`) with Anumati, or register it in the Sahamati Central Registry. The AA's public key comes from `GET /v2/entityInfo/AA/{id}` or from the sponsor |
| Libraries | Node: `jose` (`FlattenedSign` with `b64:false`, `crit:['b64']`, then drop the payload). Java: finvu-rebit-aa-jws. **Don't write your own** |

### 4.3 FI data encryption (ECDH Curve25519 + nonce)

| Step | Who | What |
|---|---|---|
| 1 | Us | Generate an ephemeral Curve25519 keypair **per FI/request** and a **random 32-byte nonce** (base64). Put the public key in `KeyMaterial.DHPublicKey.KeyValue` (PEM/X.509), the expiry in `DHPublicKey.expiry`, and the nonce in `KeyMaterial.Nonce` |
| 2 | FIP | Uses its own keypair + nonce. Shared secret = ECDH(ourPriv, fipPub). Session key derived from the secret + XOR of the two nonces (IV and salt come from the nonce XOR). AES-GCM |
| 3 | AA | Returns `encryptedFI` + the **FIP's** `KeyMaterial` (pub key + Nonce) in `/FI/fetch` |
| 4 | Us | Decrypt with ourPriv, fipPub, ourNonce, fipNonce → base64 XML/JSON of the ReBIT FI schema (`<Account type="deposit"><Profile/><Summary/><Transactions/></Account>`) |

**Use Sahamati `rahasya`, don't write this crypto yourself.** https://github.com/Sahamati/rahasya (Apache-2.0; VERIFIED from source):

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/ecc/v1/generateKey` | **GET** | none | `{ privateKey, KeyMaterial:{cryptoAlg, curve, params, DHPublicKey:{expiry, Parameters, KeyValue}}, errorInfo }`. **No nonce, so generate it yourself** |
| `/ecc/v1/decrypt` | POST | `{ base64Data, ourPrivateKey, base64YourNonce, base64RemoteNonce, remoteKeyMaterial:{cryptoAlg, curve, params, DHPublicKey:{expiry, Parameters, KeyValue}} }` | `{ base64Data, errorInfo }` (base64 of plaintext) |
| `/ecc/v1/encrypt` | POST | same shape with `data` (only needed for testing or mocking an FIP) | `{ base64Data, errorInfo }` |
| `/ecc/v1/getSharedKey` | POST | `{ ourPrivateKey, remotePublicKey }` | shared secret |

Run: `docker run -p 8080:8080 gsasikumar/forwardsecrecy:V1.2` → Swagger at `http://localhost:8080/swagger-ui.html`. Gotchas: decrypt rejects an **expired** remote key and parses expiry as `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`, so fetch promptly. The repo also has C and Node X25519 ports (`Node-X25519/`), and there is an open issue about X25519 vs "EC Curve25519" key encoding (#15). Use whichever encoding Anumati's sandbox FIP expects. If Perfios FIU++ is in the loop, **it decrypts for us** and we skip this whole section.

---

## 5. Sandbox day-1 checklist

### 5.1 Env vars (put them in `.env`, never commit)

```bash
# Anumati (AA)
AA_BASE_URL=            # from sponsor email, e.g. https://<sandbox-host>/<path>
AA_CLIENT_API_KEY=
AA_VERSION=2.0.0        # or 1.1.x, confirm
FIU_ID=                 # our DataConsumer.id as registered with Anumati
FIU_JWS_KID=
FIU_JWS_PRIVATE_KEY_PATH=./secrets/fiu_jws_private.pem
AA_JWS_PUBLIC_KEY_PATH=./secrets/aa_jws_public.pem
CALLBACK_BASE_URL=      # public HTTPS (ngrok/cloudflared) for /Consent/Notification, /FI/Notification
CUSTOMER_MOBILE=        # sponsor-provided sandbox test mobile
RAHASYA_URL=http://localhost:8080

# Perfios
PERFIOS_BASE_URL=
PERFIOS_ORG_ID=
PERFIOS_PRIVATE_KEY_PATH=./secrets/perfios_private.pem
PERFIOS_HUB_BASE_URL=
PERFIOS_HUB_KEY=        # header name TBD
PERFIOS_HUB_SECRET=
```

### 5.2 Checklist

| # | Task | Done when |
|---|---|---|
| 1 | Read the sponsor email. Fill §6 answers into this doc | Base URLs, keys and version known |
| 2 | Generate the RSA-2048 JWS keypair and send the public JWK + `kid` to Anumati | Anumati confirms |
| 3 | Expose callbacks over HTTPS (ngrok) and register `CALLBACK_BASE_URL` with Anumati | AA can reach us |
| 4 | `GET /Heartbeat` | `UP` |
| 5 | Start rahasya in Docker | `/ecc/v1/generateKey` returns keys |
| 6 | Create a consent (A1) with the §2.6 body | `ConsentHandle` returned |
| 7 | Open Anumati's consent URL with a test mobile, link a dummy FIP account, approve | Callback or poll shows ACTIVE / APPROVED + `consentId` |
| 8 | Fetch the artefact (A3) and extract `digitalSignature` | Accounts listed |
| 9 | FI request (A6) with our KeyMaterial | `sessionId` |
| 10 | Wait for `/FI/Notification` READY, then FI fetch (A8), then decrypt through rahasya | Plain FI XML/JSON on disk (delete within DataLife) |
| 11 | Perfios Hub: sign up at hub.perfios.ai, import the Postman collection, test H1–H5 with sandbox data | 200 with sample payload |
| 12 | Perfios BSA: run P2–P5 with a sample PDF | JSON report |

### 5.3 curl templates

`sign.sh` is a small helper we write that prints the detached JWS for a file (use `jose` in Node). Always sign the **same bytes** you send: use `--data-binary @file`, never inline `-d` with re-formatted JSON.

```bash
# A9 Heartbeat
curl -sS "$AA_BASE_URL/Heartbeat" -H "client_api_key: $AA_CLIENT_API_KEY"

# A1 Create consent  (body = §2.6 saved as consent.json)
curl -sS -X POST "$AA_BASE_URL/Consent" \
  -H "Content-Type: application/json" \
  -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh consent.json)" \
  --data-binary @consent.json

# A2 Consent status (v2)
cat > handle.json <<EOF
{"ver":"$AA_VERSION","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)","txnid":"$(uuidgen | tr A-Z a-z)","ConsentHandle":"$CONSENT_HANDLE"}
EOF
curl -sS -X POST "$AA_BASE_URL/Consent/handle" \
  -H "Content-Type: application/json" -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh handle.json)" --data-binary @handle.json
# A2 (v1.1.x):  curl -sS "$AA_BASE_URL/Consent/handle/$CONSENT_HANDLE" -H "client_api_key: $AA_CLIENT_API_KEY"

# A3 Consent artefact (v2)
cat > cfetch.json <<EOF
{"ver":"$AA_VERSION","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)","txnid":"$(uuidgen | tr A-Z a-z)","consentId":"$CONSENT_ID"}
EOF
curl -sS -X POST "$AA_BASE_URL/Consent/fetch" \
  -H "Content-Type: application/json" -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh cfetch.json)" --data-binary @cfetch.json
# A3 (v1.1.x):  curl -sS "$AA_BASE_URL/Consent/$CONSENT_ID" -H "client_api_key: $AA_CLIENT_API_KEY"

# C1 Generate our ECDH key (keep privateKey server-side, in memory only)
curl -sS "$RAHASYA_URL/ecc/v1/generateKey" > ourkey.json
OUR_NONCE=$(openssl rand -base64 32)

# A6 FI request: build firequest.json with FIDataRange, Consent.{id,digitalSignature},
#     KeyMaterial from ourkey.json + "Nonce": "$OUR_NONCE"
curl -sS -X POST "$AA_BASE_URL/FI/request" \
  -H "Content-Type: application/json" -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh firequest.json)" --data-binary @firequest.json

# A8 FI fetch (v2)
cat > fifetch.json <<EOF
{"ver":"$AA_VERSION","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)","txnid":"$(uuidgen | tr A-Z a-z)","sessionId":"$SESSION_ID"}
EOF
curl -sS -X POST "$AA_BASE_URL/FI/fetch" \
  -H "Content-Type: application/json" -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh fifetch.json)" --data-binary @fifetch.json > fi.json
# A8 (v1.1.x):  curl -sS "$AA_BASE_URL/FI/fetch/$SESSION_ID" -H "client_api_key: $AA_CLIENT_API_KEY" > fi.json

# C1 Decrypt one account (jq pulls FIP key + nonce from fi.json)
jq -n --slurpfile k ourkey.json --slurpfile f fi.json --arg n "$OUR_NONCE" '{
  base64Data: $f[0].FI[0].data[0].encryptedFI,
  ourPrivateKey: $k[0].privateKey,
  base64YourNonce: $n,
  base64RemoteNonce: $f[0].FI[0].KeyMaterial.Nonce,
  remoteKeyMaterial: ($f[0].FI[0].KeyMaterial | del(.Nonce))
}' | curl -sS -X POST "$RAHASYA_URL/ecc/v1/decrypt" -H "Content-Type: application/json" -d @- \
  | jq -r .base64Data | base64 -d > account0.xml

# A4 Revoke (UNVERIFIED that Anumati accepts FIU-initiated revoke)
cat > revoke.json <<EOF
{"ver":"$AA_VERSION","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)","txnid":"$(uuidgen | tr A-Z a-z)",
 "Notifier":{"type":"FIU","id":"$FIU_ID"},
 "ConsentStatusNotification":{"consentId":"$CONSENT_ID","consentHandle":"$CONSENT_HANDLE","consentStatus":"REVOKED"}}
EOF
curl -sS -X POST "$AA_BASE_URL/Consent/Notification" \
  -H "Content-Type: application/json" -H "client_api_key: $AA_CLIENT_API_KEY" \
  -H "x-jws-signature: $(./sign.sh revoke.json)" --data-binary @revoke.json

# P2 Perfios BSA initiate (UNVERIFIED path, headers and fields; signature headers omitted)
curl -sS -X POST "$PERFIOS_BASE_URL/KuberaVault/insights/v3/$PERFIOS_ORG_ID/transactions" \
  -H "Content-Type: application/json" \
  -H "X-Perfios-Algorithm: PERFIOS1-RSA-SHA256" -H "X-Perfios-Date: $PERFIOS_DATE" \
  -H "X-Perfios-Content-Sha256: $BODY_SHA256" -H "X-Perfios-Signed-Headers: host;x-perfios-content-sha256;x-perfios-date" \
  -H "X-Perfios-Signature: $PERFIOS_SIG" \
  -d '{"payload":{"txnId":"dy-001","processingType":"STATEMENT","loanAmount":1,"loanDuration":12,"loanType":"Personal","transactionCompleteCallbackUrl":"'"$CALLBACK_BASE_URL"'/perfios/callback","acceptancePolicy":"atLeastOneTransactionInRange"}}'

# P3 upload / P4 process / P5 report (UNVERIFIED)
curl -sS -X POST "$PERFIOS_BASE_URL/KuberaVault/insights/v3/$PERFIOS_ORG_ID/transactions/$PERFIOS_TXN_ID/bank-statements" -F "file=@statement.pdf" -F "password=$PDF_PASSWORD"  # + X-Perfios-* headers
curl -sS -X POST "$PERFIOS_BASE_URL/KuberaVault/insights/v3/$PERFIOS_ORG_ID/transactions/$PERFIOS_TXN_ID/process"                                                    # + X-Perfios-* headers
curl -sS "$PERFIOS_BASE_URL/KuberaVault/insights/v3/$PERFIOS_ORG_ID/transactions/$PERFIOS_TXN_ID/reports?types=json"                                                  # + X-Perfios-* headers

# H1..H5 Perfios Hub (UNVERIFIED: copy exact path and header names from the Hub Postman collection)
curl -sS -X POST "$PERFIOS_HUB_BASE_URL/<electricity-bill-path>" \
  -H "Content-Type: application/json" -H "<hub-key-header>: $PERFIOS_HUB_KEY" \
  -d '{"consumerId":"<id>","serviceProvider":"<discom-code>","consent":"Y"}'
```

---

## 6. Open questions for the sponsor contacts

| # | For | Question | Why it blocks us |
|---|---|---|---|
| 1 | Anumati | Sandbox base URL, and is it **ReBIT v2.0.0 or v1.1.x**? | Changes 3 of our calls from POST to GET |
| 2 | Anumati | Do we integrate **directly as FIU** (our FIU ID, our JWS keys), or through **Perfios FIU++** / a partner FIU's ID? | Decides whether we build §2 + §4 or just call Perfios |
| 3 | Anumati | Exact auth header name (`client_api_key`?) and whether Sahamati IAM bearer tokens or `x-request-meta` are needed in sandbox | Every request |
| 4 | Anumati | How to exchange JWS keys (JWK + kid), and where we get Anumati's public key | Signing and callback verification |
| 5 | Anumati | Consent approval UX: redirect URL format (`ecreq`/`reqdate`/`fi` + AES key?), webview SDK, or SMS link? Return URL on completion? | The Consent screen in `web/` |
| 6 | Anumati | Customer VUA suffix (`@anumati`?) and whether `Customer.Identifiers[MOBILE]` is accepted | Consent body |
| 7 | Anumati | Test mobiles and dummy FIPs that support DEPOSIT, RECURRING_DEPOSIT, INSURANCE_POLICIES | Demo data |
| 8 | Anumati | Can an FIU revoke via `POST /Consent/Notification` with REVOKED, or only the user via the Anumati app? | "Revoke" button in the Trust UX |
| 9 | Anumati | Is purpose code **102** allowed for us (vs 101)? Does the sandbox enforce Sahamati fair-use template CT008? | Consent rejection risk |
| 10 | Anumati | Which ECDH key encoding does the sandbox FIP expect (X.509 EC Curve25519 vs raw X25519)? Is rahasya V1.2 compatible? | Decryption |
| 11 | Anumati | Callback requirements: public HTTPS only, IP allow-list, retries, `aa_api_key` value | Notifications |
| 12 | Perfios | Hub base URL, auth header names (`secure-id` / `secure-credential` / `organisation-id`?) and the Postman collection | H1–H5 |
| 13 | Perfios | Exact H1–H5 product names and paths in Hub; are ration card and electricity bill live for Tier 2/3 states and DISCOMs? | Trust stage |
| 14 | Perfios | BSA API version, signing scheme (X-Perfios-* RSA?) and the key-registration process | P2–P5 |
| 15 | Perfios | BSA initiation needs `loanAmount/loanDuration/loanType`: which dummy values are accepted for a non-lending PFM use? Is there a "PFM" profile? | P2 |
| 16 | Perfios | Can the categorisation engine take **AA FI data** (ReBIT XML/JSON), or only PDFs? Does FIU++ return categorised transactions directly? | The Understand stage |
| 17 | Perfios | Sandbox rate limits and credits, and whether sandbox returns real or synthetic data | Demo planning |
| 18 | Both | Data-retention rules for the hackathon (DataLife 1 DAY), and whether we may cache decrypted FI for the demo | Security.md |

---

### Sources

- ReBIT AA API Spec v2.0.0 (PDF): https://specifications.rebit.org.in/artefacts/NBFC-AA_API_Specification_v2.0.0.pdf
- ReBIT API portal: https://api.rebit.org.in/ · https://api.rebit.org.in/spec/aa
- Sahamati purpose codes: https://sahamati.org.in/purpose-codes/
- Sahamati CT008 PFM template: https://sahamati.org.in/aa-fair-use-template-library/consent-template-id-ct008-personal-finance-management/
- Sahamati developer docs (CR, IAM): https://developer.sahamati.org.in/llms-full.txt
- Sahamati rahasya: https://github.com/Sahamati/rahasya
- Finvu JWS reference: https://github.com/finvu/finvu-rebit-aa-jws
- Finvu AA sandbox guide (v1.1.x paths): https://finvu.github.io/sandbox/finvu_aa_integration.html
- Saafe AA v2.0.0 FIU docs (sample bodies): https://docs.saafe.in/fiu-module/aa-api-v2.0.0 · https://docs.saafe.in/fiu-module/fiu-api-v2.0.0
- Anumati: https://www.anumati.co.in/ · https://www.anumati.co.in/how-anumati-works/
- Perfios FIU++: https://perfios.ai/in/products/fiu/
- Perfios Hub: https://perfios.ai/in/products/perfios-hub/ · https://perfios.ai/resources/blogs/how-to-integrate-kyc-api/
- Perfios BSA: https://www.perfios.com/solutions/bank-statement-analyzer
- Perfios EPF: https://perfios.ai/resources/blogs/utilizing-epf-verification-api-for-employee-benefits-management/
- HDFC dev portal (Perfios passbook APIs): https://developer.hdfc.bank.in/perfios-passbookretrievereport
