export type SubscriptionStatus = 'active' | 'inactive' | 'past_due'

export interface Vault {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  consent_given: boolean
  consent_given_at: string | null
}

export interface VaultAsset {
  id: string
  vault_id: string
  category: AssetCategory
  institution_name: string | null
  account_number: string | null
  description: string | null
  nominee_name: string | null
  agent_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Flexible extra fields stored as JSON via description
  extra?: Record<string, string>
}

export type AssetCategory =
  | 'bank_account'
  | 'insurance_policy'
  | 'property'
  | 'investment'
  | 'ppf_epf_post_office'
  | 'bank_locker'
  | 'digital_account'

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  bank_account: 'Bank Account',
  insurance_policy: 'Insurance Policy',
  property: 'Property',
  investment: 'Investment / Mutual Fund',
  ppf_epf_post_office: 'PPF / EPF / Post Office',
  bank_locker: 'Bank Locker',
  digital_account: 'Digital Account',
}

export interface VaultDocument {
  id: string
  vault_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: DocumentCategory
  description: string | null
  uploaded_at: string
}

export type DocumentCategory =
  | 'will'
  | 'insurance'
  | 'property'
  | 'bank'
  | 'investments'
  | 'identity'
  | 'other'

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  will: 'Will & Testament',
  insurance: 'Insurance',
  property: 'Property',
  bank: 'Bank',
  investments: 'Investments',
  identity: 'Identity',
  other: 'Other',
}

export interface VaultNominee {
  id: string
  vault_id: string
  full_name: string
  relationship: string
  phone: string | null
  email: string | null
  is_primary: boolean
  notified: boolean
  created_at: string
}

export interface VaultLetter {
  id: string
  vault_id: string
  encrypted_content: string | null
  last_edited: string
}

export interface VaultReleaseRequest {
  id: string
  vault_id: string | null
  deceased_email: string
  requested_by_name: string
  requested_by_email: string
  requested_by_phone: string | null
  relationship: string | null
  death_certificate_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  requested_at: string
  resolved_at: string | null
}

export interface VaultReleaseToken {
  id: string
  vault_id: string
  token: string
  created_at: string
  expires_at: string
  used: boolean
}

export interface VaultActivityLog {
  id: string
  vault_id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
}
