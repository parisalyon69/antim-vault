// Completeness dimensions are defined here so the scoring algorithm can be
// extended by adding a new entry to VAULT_DIMENSIONS without touching the
// component or the vault page. Each dimension contributes equally: the score
// equals (completed dimensions / total dimensions) * 100, always a round number.

export interface ScoreDimension {
  id: string
  label: string
  href: string
  weight: number      // contribution to total score (0-100, all weights must sum to 100)
  done: boolean
}

// Source of truth for the four vault dimensions.
// To add a new dimension: push a new entry here and halve all weights.
const VAULT_DIMENSIONS_META: Omit<ScoreDimension, 'done'>[] = [
  { id: 'document', label: 'Documents',           href: '/vault/documents', weight: 25 },
  { id: 'asset',    label: 'Accounts and assets', href: '/vault/assets',    weight: 25 },
  { id: 'nominee',  label: 'Nominees',            href: '/vault/nominees',  weight: 25 },
  { id: 'letter',   label: 'Personal letter',     href: '/vault/letter',    weight: 25 },
]

export interface VaultScoreInput {
  hasDocument: boolean
  hasAsset: boolean
  hasNominee: boolean
  hasLetter: boolean
}

export function buildDimensions(data: VaultScoreInput): ScoreDimension[] {
  return [
    { ...VAULT_DIMENSIONS_META[0], done: data.hasDocument },
    { ...VAULT_DIMENSIONS_META[1], done: data.hasAsset },
    { ...VAULT_DIMENSIONS_META[2], done: data.hasNominee },
    { ...VAULT_DIMENSIONS_META[3], done: data.hasLetter },
  ]
}

export function calculateCompleteness(dimensions: ScoreDimension[]): number {
  return dimensions.reduce((total, d) => total + (d.done ? d.weight : 0), 0)
}

export function completenessLabel(score: number): { text: string; colour: string } {
  if (score === 0)   return { text: 'Your vault is empty -- your family has nothing to go on', colour: '#d97706' }
  if (score <= 50)   return { text: 'A start -- but critical gaps remain',                    colour: '#ca8a04' }
  if (score < 100)   return { text: 'Almost there -- one more step',                          colour: '#4F6F52' }
  return               { text: 'Your vault is complete',                                      colour: '#16a34a' }
}
