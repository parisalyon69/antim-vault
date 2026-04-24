'use client'

import CryptoJS from 'crypto-js'

export function encryptLetter(content: string, userId: string): string {
  const key = `${userId}-${process.env.NEXT_PUBLIC_LETTER_ENCRYPTION_SECRET ?? ''}`
  return CryptoJS.AES.encrypt(content, key).toString()
}

export function decryptLetter(encrypted: string, userId: string): string {
  const key = `${userId}-${process.env.NEXT_PUBLIC_LETTER_ENCRYPTION_SECRET ?? ''}`
  const bytes = CryptoJS.AES.decrypt(encrypted, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}
