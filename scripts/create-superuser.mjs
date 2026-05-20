#!/usr/bin/env node
/**
 * Create or promote a superuser (admin + Pro subscription).
 *
 * Usage: node scripts/create-superuser.mjs <email> [password]
 *
 * If the user doesn't exist, creates them via Supabase Admin API.
 * Sets `subscriptions.status='active'` (Pro yearly, far-future expiry).
 * Sets `profiles.is_admin = true` (best effort — table optional).
 *
 * Env: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('usage: node scripts/create-superuser.mjs <email> [password]')
  process.exit(1)
}
const password = process.argv[3] || crypto.randomBytes(16).toString('base64url')
const generated = !process.argv[3]

const ADMIN = `${SUPABASE_URL}/auth/v1/admin`
const REST = `${SUPABASE_URL}/rest/v1`
const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function rpc(method, url, body) {
  const r = await fetch(url, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined })
  const txt = await r.text()
  if (!r.ok && r.status !== 201) {
    throw new Error(`${method} ${url} → ${r.status}: ${txt.substring(0, 400)}`)
  }
  return txt ? JSON.parse(txt) : null
}

async function findUser(email) {
  // GET /auth/v1/admin/users?filter=email=eq.<email> — Supabase Admin list users
  const url = `${ADMIN}/users?per_page=200`
  const r = await fetch(url, { headers: HEADERS })
  if (!r.ok) throw new Error(`list users failed: ${r.status} ${await r.text()}`)
  const json = await r.json()
  return (json.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function main() {
  console.log(`--- LaPoison superuser provisioning ---`)
  console.log(`email: ${email}`)

  let user = await findUser(email)
  if (user) {
    console.log(`User exists: ${user.id} (email_confirmed: ${!!user.email_confirmed_at})`)
    if (!user.email_confirmed_at) {
      const updated = await rpc('PUT', `${ADMIN}/users/${user.id}`, { email_confirm: true })
      console.log(`  → confirmed email`)
      user = updated
    }
  } else {
    console.log(`Creating user...`)
    user = await rpc('POST', `${ADMIN}/users`, {
      email,
      password,
      email_confirm: true,
    })
    console.log(`Created: ${user.id}`)
    if (generated) {
      console.log(`\n⚠️  TEMPORARY PASSWORD (save this — printed once):`)
      console.log(`   ${password}\n`)
    }
  }

  // Pro subscription (active, far-future)
  const farFuture = new Date()
  farFuture.setFullYear(farFuture.getFullYear() + 10)

  const existingSub = await fetch(
    `${REST}/subscriptions?user_id=eq.${user.id}&select=id,status,plan_type&limit=1`,
    { headers: HEADERS }
  ).then(r => r.json())

  if (existingSub.length > 0) {
    await rpc('PATCH', `${REST}/subscriptions?user_id=eq.${user.id}`, {
      status: 'active',
      plan_type: 'pro_yearly',
      current_period_end: farFuture.toISOString(),
      cancel_at_period_end: false,
    })
    console.log(`  → existing subscription upgraded to active pro_yearly`)
  } else {
    await rpc('POST', `${REST}/subscriptions`, {
      user_id: user.id,
      status: 'active',
      plan_type: 'pro_yearly',
      current_period_end: farFuture.toISOString(),
      cancel_at_period_end: false,
      stripe_subscription_id: `manual_admin_${user.id}`,
    })
    console.log(`  → created subscription (active pro_yearly, expires ${farFuture.toISOString().split('T')[0]})`)
  }

  // is_admin flag (profiles table - optional; migration 006 not yet applied = best-effort)
  try {
    await rpc('POST', `${REST}/profiles`, {
      id: user.id,
      is_admin: true,
      display_name: email.split('@')[0],
    })
    console.log(`  → profiles row inserted (is_admin=true)`)
  } catch (e) {
    if (/profiles/.test(e.message) && /not exist/i.test(e.message)) {
      console.log(`  ! profiles table missing — apply migration 006 then re-run to set is_admin`)
    } else if (/duplicate/.test(e.message) || /23505/.test(e.message)) {
      await rpc('PATCH', `${REST}/profiles?id=eq.${user.id}`, { is_admin: true })
      console.log(`  → profiles row updated (is_admin=true)`)
    } else {
      console.log(`  ! profiles upsert failed: ${e.message.substring(0, 200)}`)
    }
  }

  console.log(`\n✅ Superuser ready: ${email} (user_id=${user.id})`)
  console.log(`   Pro: unlimited chatbot queries`)
  console.log(`   Login at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/en/login`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
