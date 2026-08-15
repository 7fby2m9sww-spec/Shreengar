'use client'

import React, { useState } from 'react'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Mail, Phone, MapPin, Send, MessageSquare, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { submitContactToSupportAction } from '@/actions/support/actions'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const res = await submitContactToSupportAction({
      name,
      email,
      phone,
      subject,
      message,
      honeypot
    })

    setIsSubmitting(false)

    if (res.success && res.reference) {
      setReference(res.reference)
      setName('')
      setEmail('')
      setPhone('')
      setSubject('')
      setMessage('')
    } else {
      setErrorMessage(res.error || 'Unable to submit your inquiry. Please check your input and try again.')
    }
  }

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      <Breadcrumb items={[{ label: 'Contact Us' }]} />

      {/* Hero Banner Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-100 text-foreground text-xs font-serif font-bold rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>We are here to assist you</span>
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">Get in Touch with Shreengar</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Have a question about custom sizing, delivery timelines, or bulk festive orders? Send us a message and our concierge team will respond within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface-muted/70 p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-foreground pb-3 border-b border-border">
              Customer Concierge Details
            </h3>

            <div className="space-y-5 text-xs text-foreground">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-rose-950 text-amber-300">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground">Support Helpline</h5>
                  <p className="text-muted-foreground font-semibold mt-0.5">Coming Soon</p>
                  <span className="text-[10px] text-rose-900/50">Mon - Sat (10:00 AM - 7:00 PM IST)</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-rose-950 text-amber-300">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground">Email Support</h5>
                  <p className="text-muted-foreground font-semibold mt-0.5">care@shreengar.com</p>
                  <span className="text-[10px] text-rose-900/50">Response within 24 hours</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-rose-950 text-amber-300">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground">Heritage Atelier Address</h5>
                  <p className="text-muted-foreground leading-relaxed mt-0.5">
                    Shreengar Ethnic Couture<br />
                    Address Configuration: Coming Soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form (7 cols) */}
        <div className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <h3 className="font-serif text-xl font-bold text-foreground pb-3 border-b border-border flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-amber-700" />
            <span>Send Us a Message</span>
          </h3>

          {reference ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h4 className="font-serif font-bold text-base text-emerald-900 dark:text-emerald-200">
                Message Sent Successfully!
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
                Your message has been sent to Shreengar Support.<br />
                Reference: <strong className="font-mono text-amber-700 dark:text-amber-400 font-bold">{reference}</strong>.<br />
                Our team will respond within 24 hours.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReference(null)}
                className="mt-2 text-xs"
              >
                Send Another Inquiry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Spam Honeypot Field */}
              <input
                type="text"
                name="b_website"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ananya@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                />
                <Input
                  label="Subject / Topic"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Order Inquiry / Custom Sizing"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message / Details
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-surface-muted/30 text-foreground placeholder-rose-950/40 focus:outline-none focus:ring-2 focus:ring-rose-900"
                  placeholder="Please describe how we can assist you..."
                  required
                />
              </div>

              <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full py-3">
                <Send className="w-4 h-4 mr-2" /> {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
