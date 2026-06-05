import type { NextConfig } from "next";

// ── Security headers applied to every route ──────────────────────────────────
// X-Frame-Options: prevents clickjacking by disallowing iframe embeds.
// X-Content-Type-Options: prevents MIME-type sniffing attacks.
// Referrer-Policy: limits referrer data sent to cross-origin requests.
// Permissions-Policy: disables unused browser APIs (camera, mic, geolocation).
// Content-Security-Policy: restricts which sources can load scripts, styles,
//   connections, and frames. Tune the connect-src / script-src allowlists if
//   additional third-party services are added.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera=(self) is required for the mobile document scanner feature.
    // All other unused APIs remain disabled.
    value: "camera=(self), microphone=(), geolocation=(), payment=(self https://js.stripe.com)",
  },
  {
    // HSTS: force HTTPS for 2 years, include subdomains, and opt in to preload list.
    // Only effective over HTTPS — ignored on HTTP (local dev).
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inlines some scripts; Stripe.js and analytics are external.
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
      // Tailwind and component libraries may use inline styles.
      "style-src 'self' 'unsafe-inline'",
      // Images may come from Supabase storage or data URIs.
      "img-src 'self' data: blob: https:",
      // API calls go to Supabase (REST + Realtime WS) and Stripe.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      // Stripe checkout loads inside an iframe.
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every page and API route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
