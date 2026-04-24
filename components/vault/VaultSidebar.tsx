'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/vault', label: 'Overview' },
  { href: '/vault/assets', label: 'Accounts & assets' },
  { href: '/vault/documents', label: 'Documents' },
  { href: '/vault/nominees', label: 'Nominees' },
  { href: '/vault/letter', label: 'Personal letter' },
  { href: '/vault/settings', label: 'Settings' },
]

export default function VaultSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = (
    <>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/vault'
              ? pathname === '/vault'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`text-sm py-1.5 px-2 rounded transition-colors ${
                active
                  ? 'text-[#1a1a1a] font-medium'
                  : 'text-[#6b7280] hover:text-[#1a1a1a]'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="text-sm text-[#6b7280] hover:text-[#1a1a1a] text-left px-2 py-1.5 transition-colors mt-4"
      >
        Sign out
      </button>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-44 flex-shrink-0 border-r border-[#e5e7eb] flex-col py-8 px-4 min-h-screen"
        style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
      >
        <Link
          href="/"
          className="text-base font-semibold text-[#1a1a1a] mb-8 block"
          style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
        >
          Antim
        </Link>
        {navLinks}
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#e5e7eb] px-4 py-3 flex items-center justify-between"
        style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
      >
        <Link
          href="/"
          className="text-base font-semibold text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
        >
          Antim
        </Link>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-white pt-14 px-4 pb-8 flex flex-col"
          style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
        >
          {navLinks}
        </div>
      )}
    </>
  )
}
