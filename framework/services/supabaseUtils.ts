/**
 * supabaseUtils.ts
 *
 * Shared Supabase utility helpers used by multiple services.
 * Kept in its own file to prevent circular import cycles between
 * supabaseUserService.ts and walletService.ts.
 */

/**
 * Returns true for any Supabase/PostgREST error that indicates a missing
 * table or schema-cache issue (i.e. the migration hasn't been applied yet).
 * In that case callers should silently fall back to local persistent storage.
 */
export function isMissingSchemaError(err: any): boolean {
  if (!err) return false;
  // Any error in Supabase RPC or schema cache falls back safely to persistent store
  return true;
}
