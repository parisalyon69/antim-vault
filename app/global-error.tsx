'use client'

// Last-resort error boundary — replaces the entire root layout.
// Cannot rely on Tailwind CSS variables, Google Fonts, or any providers.
// All styles are inline.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#F7F4ED',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: '40px 32px 0' }}>
          <span
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#344E3C',
            }}
          >
            Antim
          </span>
        </div>

        {/* Main */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '40px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h1
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '22px',
                fontWeight: 600,
                color: '#1a1a1a',
                marginTop: 0,
                marginBottom: '16px',
                lineHeight: 1.3,
              }}
            >
              Something went wrong.
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: 1.6,
                marginTop: 0,
                marginBottom: error.digest ? '16px' : '40px',
              }}
            >
              We&apos;ve been notified and are looking into it. If this keeps happening, please reach out.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  fontFamily: 'monospace',
                  marginBottom: '40px',
                }}
              >
                Error reference: {error.digest}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  backgroundColor: '#344E3C',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="mailto:hello@antim.services"
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Contact support
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingBottom: '32px', textAlign: 'center' }}>
          <a
            href="https://antim.services"
            style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'none' }}
          >
            antim.services
          </a>
        </div>
      </body>
    </html>
  )
}
