interface VaultData {
  nomineeCount: number
  documentCount: number
  assetCount: number
  hasLetter: boolean
  hasBankAsset: boolean
  hasInsuranceAsset: boolean
}

export function calculateCompleteness(data: VaultData): number {
  let score = 0
  if (data.nomineeCount > 0) score += 20
  if (data.documentCount >= 3) score += 20
  else if (data.documentCount >= 1) score += 10
  if (data.assetCount >= 5) score += 20
  else if (data.assetCount >= 1) score += 10
  if (data.hasLetter) score += 20
  if (data.hasBankAsset) score += 10
  if (data.hasInsuranceAsset) score += 10
  return Math.min(100, score)
}

export function completenessLabel(score: number): {
  text: string
  colour: string
} {
  if (score < 40)
    return { text: 'Your family would struggle', colour: '#d97706' }
  if (score < 70) return { text: 'Getting there', colour: '#ca8a04' }
  return { text: 'Your family is protected', colour: '#16a34a' }
}
