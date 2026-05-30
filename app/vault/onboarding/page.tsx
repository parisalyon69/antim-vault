'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AccountType =
  | 'savings_account'
  | 'fd'
  | 'ppf'
  | 'mutual_fund'
  | 'property'
  | 'insurance'
  | 'other'

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'savings_account', label: 'Savings account' },
  { value: 'fd', label: 'Fixed deposit (FD)' },
  { value: 'ppf', label: 'PPF / EPF' },
  { value: 'mutual_fund', label: 'Mutual fund / Investment' },
  { value: 'property', label: 'Property' },
  { value: 'insurance', label: 'Insurance policy' },
  { value: 'other', label: 'Other' },
]

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Other']

function assetCategory(type: AccountType) {
  if (type === 'ppf') return 'ppf_epf_post_office'
  if (type === 'mutual_fund') return 'investment'
  if (type === 'property') return 'property'
  if (type === 'insurance') return 'insurance_policy'
  return 'bank_account'
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s < step
                ? 'bg-[#4F6F52] text-white'
                : s === step
                ? 'bg-[#4F6F52] text-white'
                : 'bg-[#e5e7eb] text-[#6b7280]'
            }`}
          >
            {s < step ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              s
            )}
          </div>
          {s < 3 && (
            <div
              className={`w-8 h-px transition-colors ${s < step ? 'bg-[#4F6F52]' : 'bg-[#e5e7eb]'}`}
            />
          )}
        </div>
      ))}
      <span className="text-xs text-[#6b7280] ml-2">Step {step} of 3</span>
    </div>
  )
}

const inputCls =
  'w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#4F6F52] transition-colors'
const selectCls =
  'w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#4F6F52] transition-colors bg-white'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)

  // Step 1
  const [institutionName, setInstitutionName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('savings_account')
  const [approxValue, setApproxValue] = useState('')
  const [nomineeName1, setNomineeName1] = useState('')
  const [step1Saving, setStep1Saving] = useState(false)
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [step1Added, setStep1Added] = useState<{ institution: string; type: string } | null>(null)

  // Step 2
  const [fullName, setFullName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [step2Saving, setStep2Saving] = useState(false)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [step2Added, setStep2Added] = useState<{ name: string } | null>(null)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: vault } = await supabase
        .from('vaults')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (vault) setVaultId(vault.id)
      setInitLoading(false)
    }
    init()
  }, [supabase])

  function markDone() {
    document.cookie = 'onboarding_done=1; path=/; max-age=31536000; SameSite=Lax'
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!institutionName.trim()) {
      setStep1Error('Please enter the institution name.')
      return
    }
    if (!vaultId) {
      setStep1Error('Vault not ready yet. Please wait a moment.')
      return
    }
    setStep1Saving(true)
    setStep1Error(null)
    const { error } = await supabase.from('vault_assets').insert({
      vault_id: vaultId,
      category: assetCategory(accountType),
      institution_name: institutionName,
      description: approxValue || null,
      nominee_name: nomineeName1 || null,
    })
    if (error) {
      setStep1Error('Something went wrong. Please try again.')
      setStep1Saving(false)
      return
    }
    setStep1Added({
      institution: institutionName,
      type:
        ACCOUNT_TYPE_OPTIONS.find((o) => o.value === accountType)?.label ??
        accountType,
    })
    setStep1Saving(false)
    setStep(2)
  }

  async function handleSaveNominee(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setStep2Error('Full name, email, and phone are required.')
      return
    }
    if (!vaultId) {
      setStep2Error('Vault not ready yet. Please wait a moment.')
      return
    }
    setStep2Saving(true)
    setStep2Error(null)
    const { error } = await supabase.from('vault_nominees').insert({
      vault_id: vaultId,
      full_name: fullName,
      relationship: relationship || null,
      email,
      phone,
      is_primary: true,
      notified: false,
    })
    if (error) {
      setStep2Error('Something went wrong. Please try again.')
      setStep2Saving(false)
      return
    }
    setStep2Added({ name: fullName })
    setStep2Saving(false)
    setStep(3)
  }

  function goToVault() {
    markDone()
    router.push('/vault')
    router.refresh()
  }

  if (initLoading) {
    return (
      <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
        <div className="h-7 w-48 bg-[#e5e7eb] rounded animate-pulse mb-10" />
        <div className="h-8 w-72 bg-[#e5e7eb] rounded animate-pulse mb-4" />
        <div className="h-4 w-96 bg-[#e5e7eb] rounded animate-pulse mb-8" />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <StepIndicator step={step} />

      {/* STEP 1: Add account */}
      {step === 1 && (
        <div>
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-2"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            Add your first account
          </h1>
          <p className="text-sm text-[#6b7280] mb-8 max-w-md">
            Start with one account or asset your family needs to find. You can add everything else once you're in the vault.
          </p>

          <form onSubmit={handleSaveAccount} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Institution name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. HDFC Bank, LIC, Zerodha"
                className={inputCls}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Account type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className={selectCls}
              >
                {ACCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Approximate value{' '}
                <span className="text-[#6b7280] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={approxValue}
                onChange={(e) => setApproxValue(e.target.value)}
                placeholder="e.g. Rs 5,00,000"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Nominee name on this account{' '}
                <span className="text-[#6b7280] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={nomineeName1}
                onChange={(e) => setNomineeName1(e.target.value)}
                className={inputCls}
              />
            </div>

            {step1Error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
                {step1Error}
              </p>
            )}

            <div className="flex items-center gap-5 mt-2">
              <button
                type="submit"
                disabled={step1Saving}
                className="bg-[#4F6F52] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#3d5940] transition-colors disabled:opacity-50"
              >
                {step1Saving ? 'Saving...' : 'Save and continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Add nominee */}
      {step === 2 && (
        <div>
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-2"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            Add a nominee
          </h1>
          <p className="text-sm text-[#6b7280] mb-8 max-w-md">
            Who should receive access to this vault? This person will be contacted when the time comes.
          </p>

          <form onSubmit={handleSaveNominee} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Relationship</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={selectCls}
              >
                <option value="">Select...</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">
                Phone with country code <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>

            {step2Error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
                {step2Error}
              </p>
            )}

            <div className="flex items-center gap-5 mt-2">
              <button
                type="submit"
                disabled={step2Saving}
                className="bg-[#4F6F52] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#3d5940] transition-colors disabled:opacity-50"
              >
                {step2Saving ? 'Saving...' : 'Save and continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Complete */}
      {step === 3 && (
        <div>
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-2"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            {step1Added || step2Added ? "You're off to a good start." : "Your vault is ready."}
          </h1>
          <p className="text-sm text-[#6b7280] mb-8 max-w-md">
            {step1Added || step2Added
              ? "Here's what you've added. You can fill in more from your vault at any time."
              : "You skipped the setup steps. You can add accounts, nominees, and documents from your vault whenever you're ready."}
          </p>

          <div className="flex flex-col gap-3 mb-8 max-w-md">
            <ChecklistItem
              label="Accounts and assets"
              detail={step1Added ? `${step1Added.institution} (${step1Added.type})` : null}
              done={!!step1Added}
            />
            <ChecklistItem
              label="Nominees"
              detail={step2Added ? `${step2Added.name} added` : null}
              done={!!step2Added}
            />
            <ChecklistItem label="Documents" detail={null} done={false} />
            <ChecklistItem label="Personal letter" detail={null} done={false} />
          </div>

          <p className="text-sm text-[#6b7280] mb-6 max-w-md">
            The more you add, the better protected your family will be. A complete vault takes about 20 minutes.
          </p>

          <button
            onClick={goToVault}
            className="bg-[#4F6F52] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#3d5940] transition-colors"
          >
            Go to my vault
          </button>
        </div>
      )}
    </div>
  )
}

function ChecklistItem({
  label,
  detail,
  done,
}: {
  label: string
  detail: string | null
  done: boolean
}) {
  return (
    <div
      className={`border rounded-lg px-5 py-4 flex items-start gap-3 transition-colors ${
        done ? 'border-[#4F6F52]/30 bg-[#f0fdf4]' : 'border-[#e5e7eb] bg-white'
      }`}
    >
      <div
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          done ? 'bg-[#4F6F52]' : 'border-2 border-[#d1d5db]'
        }`}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2.5 2.5 3.5-4"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[#1a1a1a]">{label}</p>
        <p className="text-xs text-[#6b7280] mt-0.5">{detail ?? 'Not added yet'}</p>
      </div>
    </div>
  )
}
