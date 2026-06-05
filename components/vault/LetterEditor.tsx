'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity'

interface Props {
  vaultId: string
  initialEncrypted: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function LetterEditor({ vaultId, initialEncrypted }: Props) {
  const supabase = createClient()
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSavedRef = useRef<string>('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [decryptError, setDecryptError] = useState(false)

  // Decrypt via server API on mount
  useEffect(() => {
    if (!editorRef.current || !initialEncrypted) return

    async function loadDecrypted() {
      const res = await fetch('/api/vault/letter/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted: initialEncrypted }),
      })

      if (!res.ok) {
        setDecryptError(true)
        return
      }

      const { content } = await res.json()
      if (editorRef.current) {
        editorRef.current.innerHTML = content
        lastSavedRef.current = content
      }
    }

    loadDecrypted()
  }, [initialEncrypted])

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

    // Single server call: encrypt + save with service client (no RLS friction)
    const res = await fetch('/api/vault/letter/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, vaultId }),
    })

    const json = await res.json()

    if (!res.ok) {
      console.error('[LetterEditor] save failed:', json.error, json.detail ?? '')
      setSaveState('error')
      return
    }

    lastSavedRef.current = content
    setIsDirty(false)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 3000)
    await logActivity(supabase, vaultId, 'letter_saved', 'Personal letter updated')
  }, [supabase, vaultId])

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

  if (decryptError) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
        Could not load your letter. Please refresh the page or contact support.
      </p>
    )
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
