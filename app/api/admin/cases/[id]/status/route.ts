import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ADMIN_EMAIL } from '@/lib/constants'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body

  const allowed = ['new', 'in-progress', 'complete']
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from('cases')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[admin/cases/status] update failed:', error.message)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
