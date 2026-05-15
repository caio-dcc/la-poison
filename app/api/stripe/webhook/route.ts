import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = session.customer as string

        if (!userId || !customerId) {
          console.warn('Missing userId or customerId in checkout.session.completed')
          return NextResponse.json({ received: true })
        }

        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: session.subscription as string,
              status: 'trialing',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (upsertError) {
          console.error('Failed to upsert subscription:', upsertError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const subscriptionId = subscription.id

        const { data: existingSub, error: fetchError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (fetchError || !existingSub) {
          console.warn(
            'Could not find subscription for customer',
            customerId
          )
          return NextResponse.json({ received: true })
        }

        const planTypeMap: Record<string, string> = {
          pro_monthly: 'pro_monthly',
          pro_yearly: 'pro_yearly',
        }

        const planType = planTypeMap[subscription.items.data[0]?.price.metadata.plan_type || ''] || 'unknown'
        const status =
          subscription.status === 'active' || subscription.status === 'trialing'
            ? 'active'
            : subscription.status
        const currentPeriodEnd = (subscription as { current_period_end?: number }).current_period_end

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status,
            plan_type: planType,
            ...(currentPeriodEnd && { current_period_end: new Date(currentPeriodEnd * 1000).toISOString() }),
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', existingSub.user_id)

        if (updateError) {
          console.error('Failed to update subscription:', updateError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: existingSub, error: fetchError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (fetchError || !existingSub) {
          console.warn(
            'Could not find subscription for customer',
            customerId
          )
          return NextResponse.json({ received: true })
        }

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', existingSub.user_id)

        if (updateError) {
          console.error('Failed to cancel subscription:', updateError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      default:
        // Ignore other event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
