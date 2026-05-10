import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>

      {/* Nav */}
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Antim
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm bg-[#1a1a1a] text-white px-4 py-2 rounded-md hover:bg-[#333] transition-colors"
            >
              Start your vault
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#1a1a1a] leading-tight mb-6" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Everything your family will need.<br />In one place.
          </h1>
          <p className="text-lg text-[#6b7280] leading-relaxed mb-10 max-w-lg mx-auto">
            Store your documents, map your accounts, and leave a message for your family — so nothing gets lost when it matters most.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#1a1a1a] text-white px-8 py-4 rounded-md text-base font-medium hover:bg-[#333] transition-colors"
          >
            Start your vault — ₹999/year
          </Link>
          <p className="mt-4 text-sm text-[#6b7280]">
            Already have a vault?{' '}
            <Link href="/auth/login" className="text-[#1a1a1a] underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-[#FAFAF9] border-t border-[#e5e7eb]">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-2xl font-semibold text-[#1a1a1a] text-center mb-12" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Three steps. We handle the rest.
          </h2>
          <div className="flex flex-col sm:flex-row gap-10">
            {[
              {
                num: '1',
                title: 'Add your accounts',
                desc: 'Map every bank, insurance policy, and investment your family will need to find.',
              },
              {
                num: '2',
                title: 'Store your documents',
                desc: 'Upload your will, policies, and property papers — securely stored and easy to find.',
              },
              {
                num: '3',
                title: 'Leave a message',
                desc: 'Write a personal letter to your family, encrypted and private. Only they will read it.',
              },
            ].map((step) => (
              <div key={step.num} className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1a1a1a] text-white text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                  {step.num}
                </div>
                <h3 className="text-base font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                  {step.title}
                </h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 px-6 border-t border-[#e5e7eb]">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-10" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Your vault is private and secure
          </h2>
          <div className="flex flex-col gap-4">
            {[
              'Documents encrypted with AES-256',
              'Your personal letter is encrypted end-to-end. Even we cannot read it.',
              'Stored on secure servers in India',
              'Access released only after identity verification',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <span className="text-[#6b7280] text-base leading-relaxed mt-0.5">—</span>
                <p className="text-[#1a1a1a] text-base leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-[#FAFAF9] border-t border-[#e5e7eb]">
        <div className="max-w-[720px] mx-auto">
          <div className="border border-[#e5e7eb] rounded-lg p-8 max-w-sm">
            <p className="text-sm text-[#6b7280] mb-1">Your Vault</p>
            <p className="text-3xl font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
              ₹999
            </p>
            <p className="text-sm text-[#6b7280] mb-8">per year</p>
            <ul className="flex flex-col gap-3 mb-8">
              {[
                'Unlimited document storage',
                'Complete asset registry',
                'Personal letter to your family',
                'Up to 2 nominees',
                '48-hour release after verification',
                'Cancel anytime',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#1a1a1a]">
                  <span className="text-[#6b7280] mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              className="block w-full text-center bg-[#1a1a1a] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#333] transition-colors"
            >
              Start your vault
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e7eb] py-10 px-6 mt-auto">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="flex items-center justify-center gap-6 mb-4 flex-wrap">
            <a href="https://antim.services" className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
              antim.services
            </a>
            <a href="https://antim.services/faq" className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
              FAQ
            </a>
            <a href="https://antim.services/privacy-policy" className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
              Privacy Policy
            </a>
            <Link href="/release" className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
              Request access
            </Link>
          </div>
          <p className="text-sm text-[#6b7280]">Antim © 2025 · Built with care for Indian families</p>
          <p className="text-sm text-[#6b7280] mt-1">hello@antim.services · antim.services</p>
        </div>
      </footer>

    </div>
  )
}
