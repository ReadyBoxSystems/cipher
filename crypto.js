// AES-256-GCM encryption via the browser's built-in Web Crypto API.
// The passphrase is never sent anywhere — all crypto happens locally.

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

async function deriveKey(passphrase, salt) {
  const raw = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(passphrase, salt)
  const buf  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return {
    payload: toB64(buf),
    iv:      toB64(iv),
    salt:    toB64(salt)
  }
}

// Returns decrypted string, or null if the passphrase is wrong.
export async function decrypt(payload, iv, salt, passphrase) {
  try {
    const key = await deriveKey(passphrase, fromB64(salt))
    const buf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv) },
      key,
      fromB64(payload)
    )
    return dec.decode(buf)
  } catch {
    return null
  }
}
