'use client'

import { useState } from 'react'
import Link from 'next/link'

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 10 * 1024 * 1024

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function ReleasePage() {
  const [yourName, setYourName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [deceasedEmail, setDeceasedEmail] = useState('')
  const [yourPhone, setYourPhone] = useState('')
  const [yourEmail, setYourEmail] = useState('')
  const [note, setNote] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) { setError('File too large. Maximum size is 10MB.'); return }
    setError(null)
    setCertFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) { setError('Please confirm the checkbox to continue.'); return }
    if (!certFile) { setError('Please upload the death certificate.'); return }

    setStatus('submitting')
    setError(null)

    const formData = new FormData()
    formData.append('yourName', yourName)
    formData.append('relationship', relationship)
    formData.append('deceasedName', deceasedName)
    formData.append('deceasedEmail', deceasedEmail)
    formData.append('yourPhone', yourPhone)
    formData.append('yourEmail', yourEmail)
    formData.append('note', note)
    formData.append('certificate', certFile)

    const res = await fetch('/api/release', { method: 'POST', body: formData })

    if (res.ok) {
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
              We have received your request
            </h1>
            <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
              Our team will contact you within 48 hours. We are deeply sorry for your loss.
            </p>
            <p className="text-sm text-[#6b7280]">
              If you have any questions, reach us at{' '}
              <a href="mailto:hello@antim.services" className="text-[#1a1a1a] underline underline-offset-2">hello@antim.services</a>
              {' '}or WhatsApp{' '}
              <a href="https://wa.me/33745722899" className="text-[#1a1a1a] underline underline-offset-2">+33 7 45 72 28 99</a>.
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

      <div className="flex-1 px-6 py-16">
        <div className="max-w-[520px] mx-auto">
          <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Requesting access to a loved one&apos;s vault
          </h1>
          <p className="text-sm text-[#6b7280] mb-8 leading-relaxed">
            We are deeply sorry for your loss. Please fill in the details below. Our team will verify and respond within 48 hours.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Your full name <span className="text-red-500">*</span></label>
              <input required type="text" value={yourName} onChange={(e) => setYourName(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Your relationship to the person who passed <span className="text-red-500">*</span></label>
              <input required type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Daughter, Son, Spouse"
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Full name of the person who passed <span className="text-red-500">*</span></label>
              <input required type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Their email address <span className="text-red-500">*</span></label>
              <p className="text-xs text-[#6b7280] mb-1.5">Used to find their vault</p>
              <input required type="email" value={deceasedEmail} onChange={(e) => setDeceasedEmail(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Your phone number <span className="text-red-500">*</span></label>
              <input required type="tel" value={yourPhone} onChange={(e) => setYourPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Your email address <span className="text-red-500">*</span></label>
              <input required type="email" value={yourEmail} onChange={(e) => setYourEmail(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Upload death certificate <span className="text-red-500">*</span></label>
              <p className="text-xs text-[#6b7280] mb-1.5">PDF, JPG, or PNG · Max 10MB</p>
              <input type="file" required accept={ACCEPTED} onChange={handleFileSelect}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors file:mr-3 file:text-sm file:border-0 file:bg-transparent file:text-[#1a1a1a] file:cursor-pointer" />
              {certFile && <p className="text-xs text-[#6b7280] mt-1">{certFile.name}</p>}
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">A short note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors resize-none" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#e5e7eb] accent-[#1a1a1a] flex-shrink-0" />
              <span className="text-sm text-[#6b7280]">
                I confirm that the person named above has passed away and I am their authorised nominee.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
