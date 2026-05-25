'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updateStatus(next: string) {
    setWorking(true)
    setError(null)

    const res = await fetch(`/api/admin/cases/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to update status.')
      setWorking(false)
      return
    }

    router.refresh()
    setWorking(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {status === 'complete' ? (
          <button
            onClick={() => updateStatus('new')}
            disabled={working}
            className="border border-[#d6d3cc] text-[#6b6b5a] rounded-md px-4 py-2 text-sm font-medium hover:bg-[#f0ede6] transition-colors disabled:opacity-50"
          >
            {working ? 'Updating…' : 'Reopen'}
          </button>
        ) : (
          <>
            {status !== 'in-progress' && (
              <button
                onClick={() => updateStatus('in-progress')}
                disabled={working}
                className="border border-amber-300 text-amber-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {working ? 'Updating…' : 'Mark in progress'}
              </button>
            )}
            <button
              onClick={() => updateStatus('complete')}
              disabled={working}
              className="bg-[#4F6F52] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#3d5740] transition-colors disabled:opacity-50"
            >
              {working ? 'Updating…' : 'Mark complete'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
