'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 10 * 1024 * 1024

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function EmergencyAccessPage() {
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeEmail, setNomineeEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [note, setNote] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError('File too large. Maximum size is 10MB.')
      return
    }
    setError(null)
    setCertFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) {
      setError('Please confirm the checkbox to continue.')
      return
    }
    if (!certFile) {
      setError('Please upload a death certificate.')
      return
    }

    setStatus('submitting')
    setError(null)

    const formData = new FormData()
    formData.append('nomineeName', nomineeName)
    formData.append('nomineeEmail', nomineeEmail)
    formData.append('ownerName', ownerName)
    formData.append('ownerEmail', ownerEmail)
    formData.append('note', note)
    formData.append('certificate', certFile)

    const res = await fetch('/api/emergency-access', { method: 'POST', body: formData })

    if (res.ok) {
      trackEvent('emergency_access_submitted')
      setStatus('success')
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong. Please try again or email hello@antim.services.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
        <nav className="border-b border-[#e5e7eb] px-6 py-4">
          <Link href="/" className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>Antim</Link>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-sm text-center">
            <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-4" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
              Your request has been received
            </h1>
            <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
              The Antim team will verify the details and contact you within 2 business days at the email address you provided.
            </p>
            <p className="text-sm text-[#6b7280] leading-relaxed">
              If you have questions in the meantime, write to us at{' '}
              <a href="mailto:hello@antim.services" className="text-[#1a1a1a] underline underline-offset-2">hello@antim.services</a>.
              We are deeply sorry for your loss.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <Link href="/" className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>Antim</Link>
      </nav>

      <div className="flex-1 px-6 py-12 md:py-16">
        <div className="max-w-[520px] mx-auto">
          <p className="text-xs uppercase tracking-wide text-[#9ca3af] mb-3">Emergency access</p>
          <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-3 leading-snug" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Requesting access to a loved one&apos;s vault
          </h1>
          <p className="text-sm text-[#6b7280] mb-2 leading-relaxed">
            If someone who stored their documents in the Antim vault has passed away, you can request access here as their named nominee.
          </p>
          <p className="text-sm text-[#6b7280] mb-8 leading-relaxed">
            Please fill in the details below. Our team will review the death certificate and contact you within 2 business days. We are deeply sorry for your loss.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Nominee details */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9ca3af] mb-3">Your details</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">
                    Your full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">
                    Your email address <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-[#9ca3af] mb-1.5">This must be the email address registered as a nominee in the vault.</p>
                  <input
                    required
                    type="email"
                    value={nomineeEmail}
                    onChange={(e) => setNomineeEmail(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Owner details */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#9ca3af] mb-3">Details of the person who passed</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">
                    Their full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">
                    Their email address <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-[#9ca3af] mb-1.5">The email address they used to create the Antim vault.</p>
                  <input
                    required
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Death certificate */}
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Death certificate <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-[#9ca3af] mb-1.5">PDF, JPG, or PNG. Maximum 10MB.</p>
              <input
                type="file"
                required
                accept={ACCEPTED}
                onChange={handleFileSelect}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors file:mr-3 file:text-sm file:border-0 file:bg-transparent file:text-[#1a1a1a] file:cursor-pointer"
              />
              {certFile && (
                <p className="text-xs text-[#6b7280] mt-1">{certFile.name}</p>
              )}
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Any additional context <span className="text-[#9ca3af] font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anything that might help the Antim team verify the request"
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors resize-none"
              />
            </div>

            {/* Confirmation */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#e5e7eb] accent-[#1a1a1a] flex-shrink-0"
              />
              <span className="text-sm text-[#6b7280] leading-relaxed">
                I confirm that I am a named nominee of the person above and that the information I have provided is accurate.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting…' : 'Submit request'}
            </button>
          </form>

          <p className="text-xs text-[#9ca3af] mt-8 leading-relaxed text-center">
            Having trouble? Write to us at{' '}
            <a href="mailto:hello@antim.services" className="underline underline-offset-2">hello@antim.services</a>
          </p>
        </div>
      </div>
    </div>
  )
}
