import { createHmac } from 'crypto'
import { Anthropic } from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/utils/supabase/server'

function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || 'default-secret'
  return createHmac('sha256', secret).update(ip).digest('hex')
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0] || realIp || 'unknown'
}

function getResetTime(): number {
  const now = new Date()
  const tomorrow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.floor(tomorrow.getTime() / 1000)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
}

async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  const supabase = await createServerClient()
  const resetAt = getResetTime()

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if Pro subscriber (unlimited)
  if (session?.user?.id) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (subscription) {
      return { allowed: true, remaining: -1, limit: -1, resetAt }
    }
  }

  // Determine identifier and limit
  const identifier = session?.user?.id || hashIp(getClientIp(req))
  const limit = session ? 10 : 3

  // Get today's usage
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('chatbot_usage')
    .select('count')
    .eq('identifier', identifier)
    .eq('date', today)
    .single()

  const currentCount = usage?.count || 0

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt }
  }

  // Increment count
  if (currentCount === 0) {
    await supabase.from('chatbot_usage').insert({
      identifier,
      date: today,
      count: 1,
    })
  } else {
    await supabase
      .from('chatbot_usage')
      .update({ count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('date', today)
  }

  return { allowed: true, remaining: limit - currentCount - 1, limit, resetAt }
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message: string }

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(req)

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: 'limit_reached',
          message: 'You reached your daily limit. Upgrade to Pro for unlimited access.',
          upgradeUrl: '/pricing',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Create streaming message
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are LaPoison, an expert cocktail assistant. You help users find recipes, suggest drinks based on ingredients they have, explain cocktail techniques, and share bartending tips. Be friendly, concise, and knowledgeable. Keep responses to 1-2 paragraphs unless asked for more detail.`,
      messages: [{ role: 'user', content: message }],
    })

    // Convert stream to ReadableStream
    const readableStream = stream.toReadableStream()

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    })
  } catch (error) {
    console.error('Chatbot error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
