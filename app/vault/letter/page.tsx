import { createClient } from '@/lib/supabase/server'
import LetterEditor from '@/components/vault/LetterEditor'

export default async function LetterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: vault } = await supabase
    .from('vaults')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vault) return null

  const { data: letter } = await supabase
    .from('vault_letters')
    .select('encrypted_content')
    .eq('vault_id', vault.id)
    .maybeSingle()

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Personal letter
      </h1>
      <p className="text-sm text-[#6b7280] mb-8 max-w-lg">
        This letter is for the people you love. Write whatever feels right — where things are, what you want them to know, what you hope for them. Only they will read it.
      </p>

      <LetterEditor
        vaultId={vault.id}
        userId={user.id}
        initialEncrypted={letter?.encrypted_content ?? null}
      />

      <p className="text-xs text-[#6b7280] mt-6 max-w-lg leading-relaxed">
        This letter is encrypted. Even we cannot read it. It will only be shown to your nominee after we verify their identity and receive the death certificate.
      </p>
    </div>
  )
}
