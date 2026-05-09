import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

function getKey(): Buffer {
  const hex = process.env.NODE_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      "NODE_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return Buffer.from(hex, "hex")
}

export function encryptPassword(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

export function decryptPassword(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted password format")
  const [ivB64, authTagB64, dataB64] = parts
  const iv = Buffer.from(ivB64!, "base64")
  const authTag = Buffer.from(authTagB64!, "base64")
  const data = Buffer.from(dataB64!, "base64")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data) + decipher.final("utf8")
}
