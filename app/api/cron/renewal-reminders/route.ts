import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  sendRenewal30DayEmail,
  sendRenewal7DayEmail,
  sendRenewalExpiredEmail,
  sendDocExpiry60Email,
  sendDocExpiry7Email,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────────

// Returns today's date string (YYYY-MM-DD) in IST (UTC+5:30).
// Used as the dedup key in reminder_emails_sent.
function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}

// Returns the ISO timestamp range (in UTC) for a calendar day in IST
// that is `offsetDays` ahead of today.
function istDateRange(offsetDays: number): { gte: string; lte: string } {
  const now = new Date()
  const target = new Date(now)
  target.setDate(target.getDate() + offsetDays)
  const ist = new Date(target.getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${d}`
  return {
    gte: new Date(`${dateStr}T00:00:00+05:30`).toISOString(),
    lte: new Date(`${dateStr}T23:59:59+05:30`).toISOString(),
  }
}

function formatDate(isoOrDate: string): string {
  // For TIMESTAMPTZ strings use as-is; for DATE-only strings append noon to avoid TZ shift
  const d = isoOrDate.includes('T')
    ? new Date(isoOrDate)
    : new Date(isoOrDate + 'T12:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

async function alreadySent(
  supabase: AnySupabase,
  vaultId: string,
  emailType: string,
  documentId?: string
): Promise<boolean> {
  let query = supabase
    .from('reminder_emails_sent')
    .select('id')
    .eq('vault_id', vaultId)
    .eq('email_type', emailType)
    .eq('sent_date', todayIST())
  if (documentId) {
    query = query.eq('document_id', documentId)
  }
  const { data } = await query.limit(1)
  return (data?.length ?? 0) > 0
}

async function logSent(
  supabase: AnySupabase,
  vaultId: string,
  emailType: string,
  documentId?: string
): Promise<void> {
  await supabase.from('reminder_emails_sent').insert({
    vault_id: vaultId,
    email_type: emailType,
    document_id: documentId ?? null,
    sent_date: todayIST(),
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Verify the request comes from Vercel's cron scheduler
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results = {
    subscription: { processed: 0, sent: 0, skipped: 0, errors: 0 },
    documents: { processed: 0, sent: 0, skipped: 0, errors: 0 },
  }

  // ── Part A: Subscription renewal reminders ─────────────────────────────────

  const subscriptionJobs: Array<{
    offsetDays: number
    emailType: string
    sendFn: (email: string, name: string, date: string) => Promise<unknown>
  }> = [
    {
      offsetDays: 30,
      emailType: '30_day',
      sendFn: (e, n, d) => sendRenewal30DayEmail(e, n, d),
    },
    {
      offsetDays: 7,
      emailType: '7_day',
      sendFn: (e, n, d) => sendRenewal7DayEmail(e, n, d),
    },
  ]

  for (const job of subscriptionJobs) {
    const range = istDateRange(job.offsetDays)
    const { data: vaults } = await supabase
      .from('vaults')
      .select('id, user_id, subscription_expiry_date')
      .eq('subscription_status', 'active')
      .gte('subscription_expiry_date', range.gte)
      .lte('subscription_expiry_date', range.lte)

    for (const vault of vaults ?? []) {
      results.subscription.processed++
      try {
        if (await alreadySent(supabase, vault.id, job.emailType)) {
          results.subscription.skipped++
          continue
        }
        const { data: { user } } = await supabase.auth.admin.getUserById(vault.user_id)
        if (!user?.email) { results.subscription.skipped++; continue }
        const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'there'
        const renewalDate = formatDate(vault.subscription_expiry_date)
        await job.sendFn(user.email, firstName, renewalDate)
        await logSent(supabase, vault.id, job.emailType)
        results.subscription.sent++
      } catch (err) {
        console.error(`[cron/renewal-reminders] ${job.emailType} failed for vault ${vault.id}:`, err)
        results.subscription.errors++
      }
    }
  }

  // Expiry notice (day of expiry, offsetDays = 0)
  {
    const range = istDateRange(0)
    const { data: expiredVaults } = await supabase
      .from('vaults')
      .select('id, user_id, subscription_expiry_date')
      .eq('subscription_status', 'active')
      .gte('subscription_expiry_date', range.gte)
      .lte('subscription_expiry_date', range.lte)

    for (const vault of expiredVaults ?? []) {
      results.subscription.processed++
      try {
        if (await alreadySent(supabase, vault.id, 'expiry')) {
          results.subscription.skipped++
          continue
        }
        const { data: { user } } = await supabase.auth.admin.getUserById(vault.user_id)
        if (!user?.email) { results.subscription.skipped++; continue }
        const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'there'
        await sendRenewalExpiredEmail(user.email, firstName)
        await logSent(supabase, vault.id, 'expiry')
        results.subscription.sent++
      } catch (err) {
        console.error(`[cron/renewal-reminders] expiry notice failed for vault ${vault.id}:`, err)
        results.subscription.errors++
      }
    }
  }

  // ── Part B: Document expiry alerts ─────────────────────────────────────────

  const docJobs: Array<{
    offsetDays: number
    emailType: string
    sendFn: (email: string, name: string, docName: string, date: string) => Promise<unknown>
  }> = [
    {
      offsetDays: 60,
      emailType: 'doc_expiry_60',
      sendFn: (e, n, dn, d) => sendDocExpiry60Email(e, n, dn, d),
    },
    {
      offsetDays: 7,
      emailType: 'doc_expiry_7',
      sendFn: (e, n, dn, d) => sendDocExpiry7Email(e, n, dn, d),
    },
  ]

  for (const job of docJobs) {
    const range = istDateRange(job.offsetDays)
    // expiry_date is a DATE column -- compare using the date string portion
    const dateStr = range.gte.split('T')[0]
    const { data: docs } = await supabase
      .from('vault_documents')
      .select('id, file_name, expiry_date, vault_id, vaults!inner(user_id)')
      .eq('expiry_date', dateStr)

    for (const doc of docs ?? []) {
      results.documents.processed++
      // TypeScript workaround: supabase join returns nested object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (doc as any).vaults?.user_id as string | undefined
      if (!userId) { results.documents.skipped++; continue }

      try {
        if (await alreadySent(supabase, doc.vault_id, job.emailType, doc.id)) {
          results.documents.skipped++
          continue
        }
        const { data: { user } } = await supabase.auth.admin.getUserById(userId)
        if (!user?.email) { results.documents.skipped++; continue }
        const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'there'
        const expiryDateFormatted = formatDate(doc.expiry_date)
        await job.sendFn(user.email, firstName, doc.file_name, expiryDateFormatted)
        await logSent(supabase, doc.vault_id, job.emailType, doc.id)
        results.documents.sent++
      } catch (err) {
        console.error(`[cron/renewal-reminders] ${job.emailType} failed for doc ${doc.id}:`, err)
        results.documents.errors++
      }
    }
  }

  console.log('[cron/renewal-reminders] completed:', JSON.stringify(results))
  return NextResponse.json({ ok: true, results })
}
