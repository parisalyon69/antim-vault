import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ADMIN_EMAIL } from '@/lib/constants'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    deceased_name,
    date_of_death,
    city,
    state,
    heir_name,
    heir_relationship,
    heir_email,
    heir_phone,
    heir_country,
    estate_scope,
    assigned_ca,
    assigned_law_firm,
    notes,
  } = body

  if (!deceased_name?.trim()) {
    return NextResponse.json({ error: 'Deceased name is required' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data, error } = await service
    .from('cases')
    .insert({
      deceased_name: deceased_name.trim(),
      date_of_death: date_of_death || null,
      city: city?.trim() || null,
      state: state || null,
      heir_name: heir_name?.trim() || null,
      heir_relationship: heir_relationship || null,
      heir_email: heir_email?.trim() || null,
      heir_phone: heir_phone?.trim() || null,
      heir_country: heir_country?.trim() || null,
      estate_scope: estate_scope?.length ? estate_scope : null,
      assigned_ca: assigned_ca?.trim() || null,
      assigned_law_firm: assigned_law_firm?.trim() || null,
      notes: notes?.trim() || null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/cases/create] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
