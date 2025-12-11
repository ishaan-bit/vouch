# End-to-End Encryption (E2EE) Design Specification

## Overview

This document outlines the design for implementing end-to-end encryption for direct messages (DMs) in Vouch. E2EE ensures that only the sender and recipient can read message contents - not even the server can decrypt them.

## Goals

1. **Privacy**: Messages are only readable by sender and recipient
2. **Forward Secrecy**: Compromising one key doesn't compromise past messages
3. **Verification**: Users can verify they're talking to the right person
4. **Usability**: Encryption is seamless and automatic

## Technical Architecture

### Cryptographic Primitives

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| Key Exchange | X25519 (ECDH) | Generate shared secrets |
| Message Encryption | XChaCha20-Poly1305 | Encrypt/decrypt messages |
| Key Derivation | HKDF-SHA256 | Derive session keys |
| Signatures | Ed25519 | Sign identity keys |
| Hashing | SHA-256 | Hash functions |

### Key Types

1. **Identity Key Pair** (Ed25519)
   - Generated once per user account
   - Used to sign prekeys and verify identity
   - Public key stored on server, private key only on device

2. **Signed Prekey** (X25519)
   - Rotated periodically (e.g., weekly)
   - Signed by identity key for authenticity
   - Used in key exchange when recipient is offline

3. **One-Time Prekeys** (X25519)
   - Pool of single-use keys uploaded to server
   - Provides forward secrecy for initial messages
   - Replenished as they're used

4. **Session Keys** (symmetric)
   - Derived from key exchange
   - Rotated with Double Ratchet algorithm

## Protocol Design

### Initial Key Exchange (X3DH)

Based on Signal's Extended Triple Diffie-Hellman protocol:

```
Alice wants to send first message to Bob:

Alice fetches from server:
  - Bob's Identity Key (IKb)
  - Bob's Signed Prekey (SPKb) + signature
  - Bob's One-Time Prekey (OPKb) [if available]

Alice generates:
  - Ephemeral Key Pair (EKa)

DH calculations:
  DH1 = X25519(IKa, SPKb)
  DH2 = X25519(EKa, IKb)
  DH3 = X25519(EKa, SPKb)
  DH4 = X25519(EKa, OPKb) [if OPKb available]

Master Secret = HKDF(DH1 || DH2 || DH3 || DH4)
Session Key = KDF(Master Secret, "session")
```

### Double Ratchet

After initial key exchange, use Double Ratchet for:
- Forward secrecy (compromise doesn't reveal past messages)
- Break-in recovery (compromise doesn't reveal future messages)

```
Each message includes:
  - Ratchet public key
  - Previous chain length
  - Message number

Key derivation:
  Root Key, Chain Key = KDF(Root Key, DH(sender_ratchet, receiver_ratchet))
  Message Key = HMAC(Chain Key, constant)
  Chain Key = HMAC(Chain Key, constant2)
```

## Database Schema Changes

```prisma
model UserKeyBundle {
  id              String   @id @default(cuid())
  userId          String   @unique
  identityKey     String   // Base64 public key
  signedPrekey    String   // Base64 public key
  prekeySignature String   // Base64 signature
  prekeyId        Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model OneTimePrekey {
  id        String   @id @default(cuid())
  userId    String
  keyId     Int
  publicKey String   // Base64 public key
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EncryptedMessage {
  id              String   @id @default(cuid())
  dmThreadId      String
  senderId        String
  // Encrypted content (ciphertext)
  ciphertext      String   // Base64 encrypted content
  // Headers for decryption
  senderRatchetKey String  // Base64 public key
  previousChainLength Int
  messageNumber   Int
  // Metadata (not encrypted)
  createdAt       DateTime @default(now())
  
  dmThread DmThread @relation(fields: [dmThreadId], references: [id], onDelete: Cascade)
  sender   User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Key Management

```typescript
// POST /api/keys/bundle - Upload key bundle
{
  identityKey: string,
  signedPrekey: string,
  prekeySignature: string,
  prekeyId: number,
  oneTimePrekeys: { keyId: number, publicKey: string }[]
}

// GET /api/keys/bundle/:userId - Get user's key bundle
Response: {
  identityKey: string,
  signedPrekey: string,
  prekeySignature: string,
  prekeyId: number,
  oneTimePrekey?: { keyId: number, publicKey: string }
}

// POST /api/keys/prekeys - Upload more one-time prekeys
{
  prekeys: { keyId: number, publicKey: string }[]
}
```

### Encrypted Messages

```typescript
// POST /api/messages/dm/encrypted
{
  recipientId: string,
  ciphertext: string,
  senderRatchetKey: string,
  previousChainLength: number,
  messageNumber: number
}

// GET /api/messages/dm/:threadId/encrypted
Response: {
  messages: [{
    id: string,
    senderId: string,
    ciphertext: string,
    senderRatchetKey: string,
    previousChainLength: number,
    messageNumber: number,
    createdAt: string
  }]
}
```

## Client Implementation

### Key Storage

Keys must be stored securely on the client:

```typescript
// Web: IndexedDB with encryption
interface KeyStorage {
  // Store private keys encrypted with user-derived key
  storeIdentityKey(key: CryptoKeyPair): Promise<void>
  storeSignedPrekey(key: CryptoKeyPair, id: number): Promise<void>
  storeOneTimePrekeys(keys: Array<{key: CryptoKeyPair, id: number}>): Promise<void>
  
  // Retrieve keys
  getIdentityKey(): Promise<CryptoKeyPair>
  getSignedPrekey(): Promise<{key: CryptoKeyPair, id: number}>
  
  // Session management
  getSession(userId: string): Promise<Session | null>
  storeSession(userId: string, session: Session): Promise<void>
}
```

### Session State

```typescript
interface Session {
  // Remote party info
  remoteIdentityKey: Uint8Array
  
  // Ratchet state
  rootKey: Uint8Array
  sendingChainKey: Uint8Array
  receivingChainKey: Uint8Array
  sendingRatchetKey: CryptoKeyPair
  receivingRatchetKey: Uint8Array
  
  // Message counters
  sendingChainLength: number
  receivingChainLength: number
  previousSendingChainLength: number
  
  // Skipped message keys (for out-of-order delivery)
  skippedMessageKeys: Map<string, Uint8Array>
}
```

### React Hook

```typescript
function useEncryptedDM(recipientId: string) {
  const { data: keyBundle } = useQuery(['keys', recipientId], () => 
    fetch(`/api/keys/bundle/${recipientId}`).then(r => r.json())
  )
  
  const session = useSession(recipientId)
  
  const sendMessage = useMutation(async (plaintext: string) => {
    // 1. Get or create session
    let sess = session
    if (!sess) {
      sess = await initializeSession(keyBundle)
    }
    
    // 2. Encrypt message
    const { ciphertext, newSession } = await encryptMessage(sess, plaintext)
    
    // 3. Send to server
    await fetch('/api/messages/dm/encrypted', {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        ciphertext: base64Encode(ciphertext),
        senderRatchetKey: base64Encode(newSession.sendingRatchetKey.publicKey),
        previousChainLength: newSession.previousSendingChainLength,
        messageNumber: newSession.sendingChainLength
      })
    })
    
    // 4. Update local session
    await storeSession(recipientId, newSession)
  })
  
  return { sendMessage, ... }
}
```

## Security Considerations

### Trust Model

1. **Trust on First Use (TOFU)**: Accept first identity key seen
2. **Safety Numbers**: Allow users to verify identity keys out-of-band
3. **Key Change Warnings**: Notify users when a contact's identity key changes

### Safety Numbers

Generate a scannable QR code and numeric fingerprint:

```typescript
function generateSafetyNumber(myIdentityKey: Uint8Array, theirIdentityKey: Uint8Array): string {
  const concat = myIdentityKey.concat(theirIdentityKey)
  const hash = sha256(concat)
  // Convert to numeric representation
  return formatAsNumeric(hash) // e.g., "12345 67890 12345 67890 12345 67890"
}
```

### Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| Server reads messages | E2EE - server only sees ciphertext |
| Key compromise | Forward secrecy via Double Ratchet |
| Man-in-the-middle | Safety number verification |
| Device theft | Local key encryption with device PIN |
| Message replay | Unique message numbers per session |
| Out-of-order delivery | Skipped message key storage |

## Implementation Phases

### Phase 1: Key Infrastructure (Week 1-2)
- [ ] Add database tables for key bundles
- [ ] Implement key generation on client
- [ ] Create key upload/download APIs
- [ ] Add key storage in IndexedDB

### Phase 2: X3DH Implementation (Week 3-4)
- [ ] Implement X3DH key agreement
- [ ] Handle offline message initiation
- [ ] Add one-time prekey consumption
- [ ] Create session initialization

### Phase 3: Double Ratchet (Week 5-6)
- [ ] Implement symmetric ratchet
- [ ] Implement DH ratchet
- [ ] Handle message encryption/decryption
- [ ] Manage skipped message keys

### Phase 4: Message Flow (Week 7-8)
- [ ] Create encrypted message API
- [ ] Update DM UI to use encryption
- [ ] Handle message decryption failures
- [ ] Add retry/recovery mechanisms

### Phase 5: Verification & Polish (Week 9-10)
- [ ] Implement safety numbers
- [ ] Add key change notifications
- [ ] Create verification UI
- [ ] Security audit

## Libraries & Dependencies

### Recommended Libraries

- **@noble/curves**: X25519, Ed25519 implementations
- **@noble/hashes**: SHA-256, HKDF implementations
- **@stablelib/xchacha20poly1305**: Message encryption
- **idb**: IndexedDB wrapper for key storage

### Example Package.json Additions

```json
{
  "dependencies": {
    "@noble/curves": "^1.2.0",
    "@noble/hashes": "^1.3.0", 
    "@stablelib/xchacha20poly1305": "^1.0.0",
    "idb": "^7.0.0"
  }
}
```

## Testing Strategy

1. **Unit Tests**: Test each cryptographic operation
2. **Integration Tests**: Test full message flow
3. **Cross-Device Tests**: Verify multi-device sync
4. **Security Tests**: Verify no plaintext leakage

## Migration Strategy

1. **Backward Compatibility**: Keep unencrypted DM endpoint working
2. **Opt-In Beta**: Let users opt into E2EE DMs
3. **Gradual Rollout**: Enable by default after stability
4. **Legacy Cleanup**: Eventually deprecate unencrypted DMs

## References

- [Signal Protocol Specification](https://signal.org/docs/)
- [X3DH Key Agreement](https://signal.org/docs/specifications/x3dh/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [Matrix E2EE Guide](https://matrix.org/docs/guides/end-to-end-encryption-implementation-guide)
