#!/usr/bin/env node

/**
 * Test suite for Auth, Stripe, and SaaS features
 * Run: node scripts/test-auth-stripe-saas.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

async function test(name, fn) {
  try {
    log(`\n→ ${name}...`, 'blue')
    await fn()
    log(`  ✓ PASS`, 'green')
    return true
  } catch (err) {
    log(`  ✗ FAIL: ${err.message}`, 'red')
    return false
  }
}

let passCount = 0
let failCount = 0

async function runTest(name, fn) {
  const result = await test(name, fn)
  if (result) passCount++
  else failCount++
}

// ============================================================
// TESTS
// ============================================================

log('\n=== Auth & Stripe SaaS Test Suite ===\n', 'blue')

// T1: Chatbot endpoint responds
await runTest('Chatbot endpoint responds (no auth)', async () => {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'How to make a mojito?' }),
  })
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
})

// T2: Rate limiting header present
await runTest('Chatbot response includes rate-limit headers', async () => {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Cocktail recommendation?' }),
  })
  const limit = res.headers.get('X-RateLimit-Limit')
  const remaining = res.headers.get('X-RateLimit-Remaining')
  const reset = res.headers.get('X-RateLimit-Reset')

  if (!limit || !remaining || !reset) {
    throw new Error('Missing rate-limit headers')
  }
})

// T3: Login endpoint exists
await runTest('Login endpoint exists', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
  })
  // Should be 401 (invalid credentials) not 404 (not found)
  if (res.status === 404) throw new Error('Endpoint not found')
  if (res.status !== 401) log(`  Note: Got ${res.status} instead of 401`, 'yellow')
})

// T4: Stripe checkout endpoint protected
await runTest('Stripe checkout requires auth', async () => {
  const res = await fetch(`${BASE_URL}/api/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: 'price_test',
      locale: 'pt',
    }),
  })
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`)
})

// T5: Stripe webhook signature validation
await runTest('Stripe webhook validates signature', async () => {
  const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'stripe-signature': 'invalid-signature',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'test' }),
  })
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`)
})

// T6: Chatbot with invalid JSON
await runTest('Chatbot rejects invalid JSON', async () => {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  if (res.status === 200) throw new Error('Should reject invalid JSON')
})

// T7: Chatbot with missing message
await runTest('Chatbot requires message field', async () => {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: 'pt' }),
  })
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`)
})

// T8: Protected route without auth redirects
await runTest('Protected route /conta redirects when not authenticated', async () => {
  const res = await fetch(`${BASE_URL}/pt/conta`, {
    redirect: 'manual',
  })
  if (res.status !== 307 && res.status !== 308) {
    throw new Error(`Expected redirect (307/308), got ${res.status}`)
  }
})

// T9: Pricing page accessible
await runTest('Pricing page is accessible', async () => {
  const res = await fetch(`${BASE_URL}/pt/pricing`)
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
})

// T10: Home page accessible
await runTest('Home page is accessible', async () => {
  const res = await fetch(`${BASE_URL}/pt`)
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
})

// ============================================================
// SUMMARY
// ============================================================

log(`\n=== Test Results ===`, 'blue')
log(`Passed: ${passCount}`, 'green')
log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'green')
log(`Total: ${passCount + failCount}\n`, 'blue')

if (failCount > 0) {
  process.exit(1)
} else {
  log('All tests passed! ✓', 'green')
  process.exit(0)
}
