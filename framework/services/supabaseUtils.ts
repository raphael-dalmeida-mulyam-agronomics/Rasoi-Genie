/**
 * supabaseUtils.ts
 *
 * Shared Supabase utility helpers used by multiple services.
 * Kept in its own file to prevent circular import cycles between
 * supabaseUserService.ts and walletService.ts.
 */

/**
 * Returns true ONLY for Supabase/PostgREST errors that indicate a missing
 * table or schema-cache issue (e.g. migration hasn't been applied yet).
 * In that case callers should silently fall back to local persistent storage.
 *
 * Returns FALSE for function-not-found (42883), permission errors, or any
 * other runtime error so callers can surface them to the user.
 */
export function isMissingSchemaError(err: any): boolean {
  if (!err) return false;
  const code: string = err.code ?? '';
  const message: string = (err.message ?? '').toLowerCase();
  const hint: string = (err.hint ?? '').toLowerCase();

  // PostgREST "relation does not exist", schema cache miss, function missing (PGRST202), or table not found (PGRST205)
  if (
    code === 'PGRST200' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    code === 'PGRST301' ||
    code === '42P01'
  )
    return true;
  // "could not find a relationship" (foreign key schema cache miss)
  if (code === 'PGRST116') return true;
  // PostgREST schema cache misses for tables, relations, and functions
  if (
    code !== '42883' &&
    (message.includes('could not find the table') ||
      message.includes('could not find the relation') ||
      message.includes('could not find the function') ||
      message.includes('in the schema cache'))
  ) {
    return true;
  }
  // Generic "does not exist" for tables only – but NOT for functions (42883)
  if (
    code !== '42883' &&
    message.includes('does not exist') &&
    (message.includes('table') || message.includes('relation') || hint.includes('relation'))
  )
    return true;

  return false;
}
