'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AssetForm from '@/components/vault/AssetForm'
import type { AssetCategory, VaultAsset } from '@/lib/types'
import { ASSET_CATEGORY_LABELS } from '@/lib/types'
import { logActivity } from '@/lib/activity'

const CATEGORIES: AssetCategory[] = [
  'bank_account',
  'insurance_policy',
  'property',
  'investment',
  'ppf_epf_post_office',
  'bank_locker',
  'digital_account',
]

export default function AssetsPage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<VaultAsset[]>([])
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [adding, setAdding] = useState<AssetCategory | null>(null)
  const [editing, setEditing] = useState<VaultAsset | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: vault } = await supabase.from('vaults').select('id').eq('user_id', user.id).single()
    if (!vault) return
    setVaultId(vault.id)
    const { data } = await supabase.from('vault_assets').select('*').eq('vault_id', vault.id).order('created_at', { ascending: true })
    setAssets((data as VaultAsset[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave(data: Partial<VaultAsset>) {
    if (!vaultId) return
    if (editing) {
      const { error } = await supabase
        .from('vault_assets')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
      if (!error) {
        await logActivity(supabase, vaultId, 'asset_updated', {
          category: data.category,
          institution_name: data.institution_name,
        })
        setEditing(null)
        await load()
      }
    } else {
      const { error } = await supabase.from('vault_assets').insert({ ...data, vault_id: vaultId })
      if (!error) {
        await logActivity(supabase, vaultId, 'asset_added', {
          category: data.category,
          institution_name: data.institution_name,
        })
        setAdding(null)
        await load()
      }
    }
  }

  async function handleDelete(id: string) {
    const asset = assets.find((a) => a.id === id)
    await supabase.from('vault_assets').delete().eq('id', id)
    await logActivity(supabase, vaultId!, 'asset_deleted', {
      category: asset?.category,
      institution_name: asset?.institution_name,
    })
    setDeleteConfirm(null)
    await load()
  }

  const grouped = CATEGORIES.reduce<Record<AssetCategory, VaultAsset[]>>((acc, cat) => {
    acc[cat] = assets.filter((a) => a.category === cat)
    return acc
  }, {} as Record<AssetCategory, VaultAsset[]>)

  if (loading) return <p className="text-sm text-[#6b7280]">Loading…</p>

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Accounts &amp; assets
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        Everything your family will need to find. Add every account, policy, and asset.
      </p>

      {CATEGORIES.map((cat) => (
        <div key={cat} className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1a1a] uppercase tracking-wide" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
              {ASSET_CATEGORY_LABELS[cat]}
              {grouped[cat].length > 0 && (
                <span className="ml-2 text-[#6b7280] font-normal normal-case tracking-normal">
                  ({grouped[cat].length})
                </span>
              )}
            </h2>
            {adding !== cat && editing?.category !== cat && (
              <button
                onClick={() => setAdding(cat)}
                className="text-sm text-[#1a1a1a] underline underline-offset-2 hover:text-[#333]"
              >
                Add
              </button>
            )}
          </div>

          {grouped[cat].length === 0 && adding !== cat && (
            <p className="text-sm text-[#6b7280] border border-dashed border-[#e5e7eb] rounded-lg px-5 py-4">
              {cat === 'bank_account' && "Your family doesn't know what bank accounts exist yet."}
              {cat === 'insurance_policy' && "Your family doesn't know about your insurance policies yet."}
              {cat === 'property' && "No property listed."}
              {cat === 'investment' && "No investments added."}
              {cat === 'ppf_epf_post_office' && "No PPF, EPF, or post office accounts added."}
              {cat === 'bank_locker' && "No bank locker added."}
              {cat === 'digital_account' && "No digital accounts added."}
            </p>
          )}

          {grouped[cat].map((asset) => (
            <div key={asset.id}>
              {editing?.id === asset.id ? (
                <div className="border border-[#e5e7eb] rounded-lg p-6 mb-3">
                  <AssetForm
                    category={cat}
                    initial={{
                      category: asset.category,
                      institution_name: asset.institution_name ?? undefined,
                      account_number: asset.account_number ?? undefined,
                      nominee_name: asset.nominee_name ?? undefined,
                      agent_contact: asset.agent_contact ?? undefined,
                      notes: asset.notes ?? undefined,
                      description: asset.description ?? undefined,
                    }}
                    onSave={async (d) => { await handleSave(d); setEditing(null) }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              ) : (
                <div className="border border-[#e5e7eb] rounded-lg px-5 py-4 mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {asset.institution_name ?? 'Unnamed'}
                    </p>
                    {asset.account_number && (
                      <p className="text-sm text-[#6b7280] mt-0.5">····{asset.account_number}</p>
                    )}
                    {asset.nominee_name && (
                      <p className="text-sm text-[#6b7280] mt-0.5">Nominee: {asset.nominee_name}</p>
                    )}
                    {asset.notes && <p className="text-sm text-[#6b7280] mt-1">{asset.notes}</p>}
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => setEditing(asset)} className="text-sm text-[#1a1a1a] underline underline-offset-2">Edit</button>
                    <button onClick={() => setDeleteConfirm(asset.id)} className="text-sm text-red-600 underline underline-offset-2">Delete</button>
                  </div>
                </div>
              )}

              {deleteConfirm === asset.id && (
                <div className="border border-red-100 bg-red-50 rounded-lg px-5 py-4 mb-3">
                  <p className="text-sm text-[#1a1a1a] mb-3">Remove this asset? This cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleDelete(asset.id)} className="text-sm bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700">Remove</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-sm border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2 hover:bg-[#fafaf9]">Keep</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {adding === cat && (
            <div className="border border-[#e5e7eb] rounded-lg p-6 mt-2">
              <AssetForm
                category={cat}
                onSave={async (d) => { await handleSave(d); setAdding(null) }}
                onCancel={() => setAdding(null)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
