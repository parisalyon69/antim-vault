import { createClient } from '@/lib/supabase/server'
import type { VaultActivityLog } from '@/lib/types'

// Action → icon SVG path mapping
function ActionIcon({ action }: { action: string }) {
  // Document actions
  if (action.startsWith('document_')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
        <path d="M4 2h5.5L12 4.5V14H4V2z" stroke="#9ca3af" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M9.5 2v2.5H12" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 8h4M6 10.5h2.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  // Asset actions
  if (action.startsWith('asset_')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
        <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="#9ca3af" strokeWidth="1.2" />
        <path d="M5 5V4a3 3 0 016 0v1" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M8 9v2" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  // Nominee actions
  if (action.startsWith('nominee_')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
        <circle cx="8" cy="6" r="2.5" stroke="#9ca3af" strokeWidth="1.2" />
        <path d="M3 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  // Letter actions
  if (action === 'letter_updated') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
        <path d="M2 4.5h12M2 7.5h8M2 10.5h6" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }
  // Default
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
      <circle cx="8" cy="8" r="5.5" stroke="#9ca3af" strokeWidth="1.2" />
      <path d="M8 5v3l2 1.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: vault } = await supabase
    .from('vaults')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vault) return null

  const { data: logs } = await supabase
    .from('vault_activity_log')
    .select('*')
    .eq('vault_id', vault.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const entries = (logs as VaultActivityLog[]) ?? []

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1
        className="text-2xl font-semibold text-[#1a1a1a] mb-2"
        style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
      >
        Activity
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        A record of changes to your vault. Showing the last 50 entries.
      </p>

      {entries.length === 0 ? (
        <div className="border border-dashed border-[#e5e7eb] rounded-lg px-6 py-12 text-center">
          <p className="text-sm text-[#6b7280]">
            No activity yet. Start by uploading a document.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-start gap-3 py-3.5 ${
                i < entries.length - 1 ? 'border-b border-[#f3f4f6]' : ''
              }`}
            >
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[#f9faf9] border border-[#f0f0ef] flex items-center justify-center flex-shrink-0">
                <ActionIcon action={entry.action} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a1a1a] leading-snug">
                  {entry.description || entry.action.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  {relativeTime(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
