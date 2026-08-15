import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

const PAYMENT_GATEWAY_ENABLED = false

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!PAYMENT_GATEWAY_ENABLED) {
      return NextResponse.json({ status: 'ok', message: 'Payment gateway is disabled' })
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Payment gateway is not configured' }, { status: 400 })
    }

    if (signature && process.env.NODE_ENV === 'production') {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody || '')
        .digest('hex')

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
      }
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event
    const payment = payload.payload?.payment?.entity

    const supabase = await createClient()

    if (event === 'payment.captured') {
      const orderId = payment?.notes?.shreengar_order_id

      if (orderId) {
        // Call confirm_payment_and_deduct_inventory_atomic RPC
        const { error: rpcErr } = await supabase.rpc('confirm_payment_and_deduct_inventory_atomic', {
          p_order_id: orderId,
          p_transaction_id: payment?.id || 'webhook-txn',
          p_payment_method: 'card'
        })
        if (rpcErr) {
          console.error('[WEBHOOK-PAYMENT-CONFIRM-ERROR]', rpcErr)
        }
      }
    } else if (event === 'payment.failed') {
      const orderId = payment?.notes?.shreengar_order_id

      if (orderId) {
        await supabase.from('payments').insert({
          order_id: orderId,
          payment_method: payment?.method || 'online',
          transaction_id: payment?.id,
          status: 'failed',
          amount: (payment?.amount || 0) / 100,
        })
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
