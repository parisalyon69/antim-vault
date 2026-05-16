export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import AdminDashboard from './dashboard'
import type { VaultReleaseRequest } from '@/lib/types'

export type RequestWithCertUrl = VaultReleaseRequest & { cert_url?: string }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/vault')

  const service = await createServiceClient()
  const { data: requests } = await service
    .from('vault_release_requests')
    .select('*')
    .order('requested_at', { ascending: false })

  const withUrls: RequestWithCertUrl[] = await Promise.all(
    (requests ?? []).map(async (r) => {
      if (!r.death_certificate_path) return { ...r, cert_url: undefined }
      const { data: signed } = await service.storage
        .from('release-documents')
        .createSignedUrl(r.death_certificate_path, 3600)
      return { ...r, cert_url: signed?.signedUrl }
    })
  )

  return <AdminDashboard initialRequests={withUrls} />
}
