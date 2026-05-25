// Server-only. No 'use client' — this module must never be imported by client components.
// LETTER_ENCRYPTION_SECRET is not prefixed with NEXT_PUBLIC_ and is therefore
// never included in the browser bundle.
import CryptoJS from 'crypto-js'

export function encryptLetter(content: string, userId: string): string {
  const key = `${userId}-${process.env.LETTER_ENCRYPTION_SECRET ?? ''}`
  return CryptoJS.AES.encrypt(content, key).toString()
}

export function decryptLetter(encrypted: string, userId: string): string {
  const key = `${userId}-${process.env.LETTER_ENCRYPTION_SECRET ?? ''}`
  const bytes = CryptoJS.AES.decrypt(encrypted, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}
