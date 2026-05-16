// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = { from: (table: string) => any }

/**
 * Write one activity log entry. Failures are silently swallowed —
 * activity logging must NEVER break the parent operation.
 */
export async function logActivity(
  supabase: AnySupabaseClient,
  vaultId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('vault_activity_log').insert({
      vault_id: vaultId,
      action,
      details: details ?? null,
    })
  } catch {
    // Intentionally swallowed
  }
}
