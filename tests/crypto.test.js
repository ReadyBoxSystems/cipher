/**
 * Tests for crypto.js — AES-256-GCM encrypt/decrypt
 *
 * Behaviors under test:
 *   - encrypt returns { payload, iv, salt } with non-empty base64 strings
 *   - decrypt returns plaintext when given correct passphrase
 *   - decrypt returns null (does NOT throw) when given wrong passphrase
 *   - encrypt of a 5MB string completes without RangeError / stack overflow
 *   - encrypt('hi', '') rejects with Error message containing 'passphrase'
 *   - encrypt('hi', null) rejects with Error message containing 'passphrase'
 *   - encrypt('hi', undefined) rejects with Error message containing 'passphrase'
 *   - Round-trip of 1MB payload returns exact same string
 */

import { encrypt, decrypt } from '../crypto.js'

describe('crypto.js — basic round-trip', () => {
  test('encrypt returns payload, iv, salt as non-empty strings', async () => {
    const result = await encrypt('hello', 'pw')
    expect(typeof result.payload).toBe('string')
    expect(typeof result.iv).toBe('string')
    expect(typeof result.salt).toBe('string')
    expect(result.payload.length).toBeGreaterThan(0)
    expect(result.iv.length).toBeGreaterThan(0)
    expect(result.salt.length).toBeGreaterThan(0)
  })

  test('decrypt returns plaintext for matching ciphertext', async () => {
    const result = await encrypt('hello', 'pw')
    const back = await decrypt(result.payload, result.iv, result.salt, 'pw')
    expect(back).toBe('hello')
  })

  test('decrypt returns null (does not throw) for wrong passphrase', async () => {
    const result = await encrypt('hello', 'pw')
    const back = await decrypt(result.payload, result.iv, result.salt, 'wrong')
    expect(back).toBeNull()
  })
})

describe('crypto.js — large payload (stack overflow fix)', () => {
  test('encrypts 5MB string without RangeError', async () => {
    const big = 'A'.repeat(5_000_000)
    const result = await encrypt(big, 'pw')
    expect(result.payload.length).toBeGreaterThan(0)
  }, 30000) // allow 30s for PBKDF2 on CI

  test('round-trips 1MB payload exactly', async () => {
    const payload = 'B'.repeat(1_000_000)
    const result = await encrypt(payload, 'pw')
    const back = await decrypt(result.payload, result.iv, result.salt, 'pw')
    expect(back).toBe(payload)
  }, 30000)
})

describe('crypto.js — empty passphrase guard', () => {
  test('encrypt rejects empty string passphrase', async () => {
    await expect(encrypt('hi', '')).rejects.toThrow(/passphrase/i)
  })

  test('encrypt rejects null passphrase', async () => {
    await expect(encrypt('hi', null)).rejects.toThrow(/passphrase/i)
  })

  test('encrypt rejects undefined passphrase', async () => {
    await expect(encrypt('hi', undefined)).rejects.toThrow(/passphrase/i)
  })

  test('decrypt rejects empty string passphrase', async () => {
    await expect(decrypt('payload', 'iv', 'salt', '')).rejects.toThrow(/passphrase/i)
  })

  test('decrypt rejects null passphrase', async () => {
    await expect(decrypt('payload', 'iv', 'salt', null)).rejects.toThrow(/passphrase/i)
  })
})
