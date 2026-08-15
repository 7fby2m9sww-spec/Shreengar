import crypto from 'crypto'

interface RateLimitRecord {
  count: number
  firstAttempt: number
  lastSubmissions: Array<{ hash: string; timestamp: number }>
}

const contactRateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  for (const [key, record] of contactRateLimitStore.entries()) {
    if (now - record.firstAttempt > windowMs) {
      contactRateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000).unref?.()

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function checkContactRateLimit(clientIp: string, email: string, subject: string, message: string): {
  allowed: boolean
  error?: string
} {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 mins
  const maxAttempts = 5

  const ipHash = hashString(clientIp || '127.0.0.1')
  const emailHash = hashString(email.toLowerCase().trim())
  const storeKey = `${ipHash}:${emailHash}`

  const record = contactRateLimitStore.get(storeKey) || {
    count: 0,
    firstAttempt: now,
    lastSubmissions: []
  }

  // Reset window if expired
  if (now - record.firstAttempt > windowMs) {
    record.count = 0
    record.firstAttempt = now
    record.lastSubmissions = []
  }

  // 1. Duplicate submission check (within 60s)
  const submissionContentHash = hashString(`${emailHash}:${subject.trim()}:${message.trim()}`)
  const isDuplicate = record.lastSubmissions.some(
    sub => sub.hash === submissionContentHash && now - sub.timestamp < 60 * 1000
  )

  if (isDuplicate) {
    return {
      allowed: false,
      error: 'A duplicate inquiry was recently submitted. Please wait a minute before submitting again.'
    }
  }

  // 2. Max attempts check
  if (record.count >= maxAttempts) {
    const minutesRemaining = Math.ceil((windowMs - (now - record.firstAttempt)) / 60000)
    return {
      allowed: false,
      error: `Too many contact inquiries submitted. Please try again in ${minutesRemaining} minutes.`
    }
  }

  // Record attempt
  record.count += 1
  record.lastSubmissions.push({ hash: submissionContentHash, timestamp: now })
  contactRateLimitStore.set(storeKey, record)

  return { allowed: true }
}
