export type ProviderConfig = {
  imap: { host: string; port: number; secure: boolean }
  smtp: { host: string; port: number; secure: boolean }
}

export const KNOWN_PROVIDERS: Record<string, ProviderConfig> = {
  // Fournisseurs français
  "orange.fr": {
    imap: { host: "imap.orange.fr", port: 993, secure: true },
    smtp: { host: "smtp.orange.fr", port: 465, secure: true },
  },
  "wanadoo.fr": {
    imap: { host: "imap.orange.fr", port: 993, secure: true },
    smtp: { host: "smtp.orange.fr", port: 465, secure: true },
  },
  "sfr.fr": {
    imap: { host: "imap.sfr.fr", port: 993, secure: true },
    smtp: { host: "smtp.sfr.fr", port: 465, secure: true },
  },
  "neuf.fr": {
    imap: { host: "imap.sfr.fr", port: 993, secure: true },
    smtp: { host: "smtp.sfr.fr", port: 465, secure: true },
  },
  "laposte.net": {
    imap: { host: "imap.laposte.net", port: 993, secure: true },
    smtp: { host: "smtp.laposte.net", port: 465, secure: true },
  },
  "free.fr": {
    imap: { host: "imap.free.fr", port: 993, secure: true },
    smtp: { host: "smtp.free.fr", port: 465, secure: true },
  },
  "alice.fr": {
    imap: { host: "imap.free.fr", port: 993, secure: true },
    smtp: { host: "smtp.free.fr", port: 465, secure: true },
  },
  "bbox.fr": {
    imap: { host: "imap.bbox.fr", port: 993, secure: true },
    smtp: { host: "smtp.bbox.fr", port: 465, secure: true },
  },
  "numericable.fr": {
    imap: { host: "imap.numericable.fr", port: 993, secure: true },
    smtp: { host: "smtp.numericable.fr", port: 465, secure: true },
  },
  // Internationaux
  "yahoo.fr": {
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  },
  "yahoo.com": {
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  },
  "hotmail.com": {
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "outlook.com": {
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "live.fr": {
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "live.com": {
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "msn.com": {
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "icloud.com": {
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
  },
  "me.com": {
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
  },
  "mac.com": {
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
  },
}

export function detectProvider(email: string): ProviderConfig | null {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return null
  return KNOWN_PROVIDERS[domain] ?? null
}

function parseIspdbXml(xml: string): ProviderConfig | null {
  try {
    const imapMatch = xml.match(
      /<incomingServer[^>]*type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/
    )
    const smtpMatch = xml.match(/<outgoingServer[^>]*>([\s\S]*?)<\/outgoingServer>/)
    if (!imapMatch || !smtpMatch) return null

    const extractField = (block: string, tag: string): string | null => {
      const m = block.match(new RegExp(`<${tag}>([^<]+)<\/${tag}>`))
      return m?.[1]?.trim() ?? null
    }

    const imapBlock = imapMatch[1]!
    const smtpBlock = smtpMatch[1]!

    const imapHost = extractField(imapBlock, "hostname")
    const imapPort = extractField(imapBlock, "port")
    const imapSocket = extractField(imapBlock, "socketType")
    const smtpHost = extractField(smtpBlock, "hostname")
    const smtpPort = extractField(smtpBlock, "port")
    const smtpSocket = extractField(smtpBlock, "socketType")

    if (!imapHost || !imapPort || !smtpHost || !smtpPort) return null

    return {
      imap: {
        host: imapHost,
        port: parseInt(imapPort, 10),
        secure: imapSocket === "SSL" || imapSocket === "SSL/TLS",
      },
      smtp: {
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpSocket === "SSL" || smtpSocket === "SSL/TLS",
      },
    }
  } catch {
    return null
  }
}

export async function fetchIspdbConfig(email: string): Promise<ProviderConfig | null> {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return null
  try {
    const res = await fetch(`https://autoconfig.thunderbird.net/v1.1/${domain}`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    return parseIspdbXml(xml)
  } catch {
    return null
  }
}
