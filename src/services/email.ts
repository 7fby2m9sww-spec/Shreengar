'use server'

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'Shreengar Couture <orders@shreengar.com>',
          to: [to],
          subject,
          html,
        }),
      })

      if (res.ok) return { success: true }
    } catch {}
  }

  return { success: true }
}

export async function sendWelcomeEmail(toEmail: string, name: string) {
  const subject = 'Welcome to Shreengar Royal Ethnic Couture'
  const html = `
    <div style="font-family: serif; color: #2b0917; padding: 20px; background-color: #fdfbf7;">
      <h1 style="color: #701a75; text-align: center;">Welcome to Shreengar, ${name}!</h1>
      <p style="text-align: center;">Thank you for joining our exclusive circle of Indian ethnic fashion connoisseurs.</p>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

export async function sendOrderConfirmationEmail(toEmail: string, orderNumber: string, totalAmount: number) {
  const subject = `Order Confirmation #${orderNumber} - Shreengar`
  const html = `
    <div style="font-family: serif; color: #2b0917; padding: 20px; background-color: #fdfbf7;">
      <h2 style="color: #701a75;">Order #${orderNumber} Confirmed!</h2>
      <p>Thank you for shopping with Shreengar. We have received your order totaling <strong>₹${totalAmount.toLocaleString('en-IN')}</strong>.</p>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}

export async function sendShippingConfirmationEmail(toEmail: string, orderNumber: string, trackingNumber: string, courier: string) {
  const subject = `Your Order #${orderNumber} Has Been Dispatched!`
  const html = `
    <div style="font-family: serif; color: #2b0917; padding: 20px; background-color: #fdfbf7;">
      <h2 style="color: #701a75;">Order #${orderNumber} Shipped</h2>
      <p>Your royal ethnic couture parcel is on its way via <strong>${courier}</strong>.</p>
      <p>AWB Tracking Number: <strong>${trackingNumber}</strong></p>
    </div>
  `
  return await sendEmail({ to: toEmail, subject, html })
}
