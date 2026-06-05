// The guided onboarding tour now lives on the vault dashboard (/vault) as an
// inline panel rather than a separate page. This redirect ensures any bookmarked
// or cached links to /vault/onboarding land somewhere useful.
import { redirect } from 'next/navigation'

export default function OnboardingRedirect() {
  redirect('/vault')
}
