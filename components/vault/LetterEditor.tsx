'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { encryptLetter, decryptLetter } from '@/lib/vault/encryption'
import { createClient } from '@/lib/supabase/client'

interface Props {
  vaultId: string
  userId: string
  initialEncrypted: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function LetterEditor({ vaultId, userId, initialEncrypted }: Props) {
  const supabase = createClient()
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSavedRef = useRef<string>('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isDirty, setIsDirty] = useState(false)

  // Decrypt and populate on mount
  useEffect(() => {
    if (!editorRef.current) return
    if (initialEncrypted) {
      try {
        const decrypted = decryptLetter(initialEncrypted, userId)
        editorRef.current.innerHTML = decrypted
        lastSavedRef.current = decrypted
      } catch {
        editorRef.current.innerHTML = ''
      }
    }
  }, [initialEncrypted, userId])

  // Warn on navigation if dirty
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const save = useCallback(async () => {
    if (!editorRef.current) return
    const content = editorRef.current.innerHTML
    if (content === lastSavedRef.current) return

    setSaveState('saving')
    const encrypted = encryptLetter(content, userId)

    const { error } = await supabase.from('vault_letters').upsert(
      { vault_id: vaultId, encrypted_content: encrypted, last_edited: new Date().toISOString() },
      { onConflict: 'vault_id' }
    )

    if (error) {
      setSaveState('error')
    } else {
      lastSavedRef.current = content
      setIsDirty(false)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }, [supabase, userId, vaultId])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(save, 30_000)
    return () => clearInterval(interval)
  }, [save])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      document.execCommand('bold')
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault()
      document.execCommand('italic')
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => document.execCommand('bold')}
            className="text-xs border border-[#e5e7eb] rounded px-2.5 py-1 text-[#1a1a1a] hover:bg-[#fafaf9] font-bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => document.execCommand('italic')}
            className="text-xs border border-[#e5e7eb] rounded px-2.5 py-1 text-[#1a1a1a] hover:bg-[#fafaf9] italic"
          >
            I
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#6b7280]">
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved'}
            {saveState === 'error' && 'Save failed — try again'}
            {saveState === 'idle' && isDirty && 'Unsaved changes'}
          </span>
          <button
            type="button"
            onClick={save}
            className="bg-[#1a1a1a] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setIsDirty(true)}
        onKeyDown={handleKeyDown}
        className="min-h-[360px] border border-[#e5e7eb] rounded-lg px-6 py-5 text-[#1a1a1a] text-base leading-relaxed focus:outline-none focus:border-[#1a1a1a] transition-colors"
        style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)', lineHeight: '1.85' }}
        data-placeholder="Start writing…"
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
