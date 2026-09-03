Comitium brings end-to-end encryption into the hiring workflow. Resumes, contact details, application answers, notes, feedback, attachments, and private messages are protected for authorized access.

Candidates apply normally. Hiring teams can search, collaborate, and move candidates through the pipeline as they would in any modern ATS. Encryption works automatically in the background, without passwords to exchange or encrypted files to manage.

## Private by default

Content submitted through the web app is encrypted in the browser before upload. Incoming email is encrypted before permanent storage. Sensitive recruitment content is stored as ciphertext.

Every protected record or file receives a fresh random 256-bit data key. The content is encrypted with AES-256-GCM, and its data key is protected for the hiring organization's vault. There is no universal master key for every organization's data.

## Searchable where it matters

Comitium separates private recruitment content from the structured data that makes an ATS useful. Skills, occupations, matching signals, pipeline stages, workflow state, and permissions remain available within the product for search, matching, and day-to-day hiring operations.

This keeps the hiring workflow fast and searchable while the underlying private content stays encrypted.

## Access built for hiring teams

Each organization has its own encrypted vault. A candidate's browser can encrypt an application for the vault without receiving its private key, while every authorized member receives separately protected access through their personal key.

Organization roles and permissions determine which records each member can use. Cryptographic operations stay isolated inside a dedicated browser Web Worker.

## Protection designed to last

Recruitment records can remain sensitive for years. Comitium protects data keys and vault keys with X-Wing, combining ML-KEM-768, standardized in NIST FIPS 203, with the established X25519 mechanism.

This hybrid approach adds post-quantum protection without changing how people use the product.

## Open technical foundation

- **Records and files:** AES-256-GCM with a separate random data key
- **Key wrapping:** X-Wing with ML-KEM-768 and X25519
- **Key derivation:** HKDF-SHA256
- **Context binding:** authenticated organization, record, field, recipient, and purpose context

Versioned encrypted envelopes allow the cryptographic foundation to evolve as standards and implementations advance.

You can inspect the [client-side cryptography source](https://github.com/comitiumhq/web/tree/main/packages/crypto), read [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final), [NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final), and the [X-Wing specification](https://datatracker.ietf.org/doc/draft-connolly-cfrg-xwing-kem/).
