import type { NextConfig } from "next";

// ── Security headers applied to every route ──────────────────────────────────
// X-Frame-Options:              prevents clickjacking via iframe embeds.
// X-Content-Type-Options:       prevents MIME-type sniffing attacks.
// X-XSS-Protection:             legacy XSS filter for older browsers (belt-and-suspenders).
// Referrer-Policy:              limits referrer data sent to cross-origin requests.
// Permissions-Policy:           disables unused browser APIs.
// Strict-Transport-Security:    forces HTTPS for 2 years; enables preload list.
// Content-Security-Policy:      restricts script, style, image, and network sources.
//   - script-src includes googletagmanager.com and google-analytics.com for GA4.
//   - connect-src includes google-analytics.com endpoints for GA4 measurement hits.
//   - img-src allows https: broadly (Supabase storage URLs are not predictable).
//   - frame-src limited to Stripe iframes.
//   - No wildcard * in script-src or connect-src.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt-and-suspenders for older browsers; modern browsers rely on CSP instead.
  { key: "X-XSS-Protection", value: "1; mode=block" },
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
      // Next.js inlines some scripts; Stripe.js and GA4 (via GTM) are external.
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
      // Tailwind and component libraries may use inline styles.
      "style-src 'self' 'unsafe-inline'",
      // Images may come from Supabase storage or data URIs.
      "img-src 'self' data: blob: https:",
      // API calls: Supabase (REST + Realtime WS), Stripe, and GA4 measurement endpoints.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://region1.google-analytics.com",
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
