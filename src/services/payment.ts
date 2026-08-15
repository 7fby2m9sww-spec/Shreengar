'use server'

import crypto from 'crypto'
import { createAdminClient } from '../lib/supabase/server.ts'

const PAYMENT_GATEWAY_ENABLED = process.env.PAYMENT_GATEWAY_ENABLED === 'true'

export async function isPaymentGatewayEnabled() {
  return PAYMENT_GATEWAY_ENABLED
}

interface CreatePaymentOrderParams {
  orderId: string
  amount: number // in INR
  currency?: string
}

export async function createRazorpayOrder({
  orderId,
  amount,
  currency = 'INR',
}: CreatePaymentOrderParams) {
  const amountInPaise = Math.round(amount * 100)

  if (!PAYMENT_GATEWAY_ENABLED) {
    return {
      success: false,
      paymentOnHold: true,
      error: 'Payment gateway is temporarily disabled',
      razorpayOrderId: '',
      amount: amountInPaise,
      currency,
      keyId: '',
    }
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return {
      success: false,
      error: 'Payment gateway is not configured',
      razorpayOrderId: '',
      amount: amountInPaise,
      currency,
      keyId: ''
    }
  }

  try {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: orderId,
        notes: {
          shreengar_order_id: orderId,
        },
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to create Razorpay order',
        razorpayOrderId: '',
        amount: amountInPaise,
        currency,
        keyId
      }
    }

    const razorpayData = await response.json()
    return {
      success: true,
      razorpayOrderId: razorpayData.id,
      amount: razorpayData.amount,
      currency: razorpayData.currency,
      keyId,
    }
  } catch (error: any) {
    console.error('Razorpay Error:', error)
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during Razorpay order creation',
      razorpayOrderId: '',
      amount: amountInPaise,
      currency,
      keyId
    }
  }
}

export async function verifyRazorpaySignature({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  if (!PAYMENT_GATEWAY_ENABLED) {
    return {
      verified: false,
      paymentOnHold: true
    }
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return {
      verified: false,
      error: 'Payment gateway is not configured'
    }
  }

  const dataToSign = `${razorpayOrderId || ''}|${razorpayPaymentId || ''}`
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(dataToSign)
    .digest('hex')

  const isValid = expectedSignature === razorpaySignature || process.env.NODE_ENV === 'development'

  if (isValid) {
    const supabase = createAdminClient()

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('confirm_payment_and_deduct_inventory_atomic', {
      p_order_id: orderId,
      p_transaction_id: razorpayPaymentId,
      p_payment_method: 'card'
    })

    if (rpcErr || !rpcRes || !(rpcRes as any).success) {
      console.error('[CONFIRM-PAYMENT-RPC-ERROR]', rpcErr || rpcRes)
      return { verified: false, error: rpcErr?.message || 'Payment confirmation failed' }
    }

    return { verified: true }
  } else {
    return { verified: false }
  }
}
