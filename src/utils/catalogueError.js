export function getCatalogueErrorDetails(error) {
  return {
    code: typeof error?.code === 'string' ? error.code : null,
    message: typeof error?.message === 'string' ? error.message : String(error ?? 'Unknown error'),
    details: typeof error?.details === 'string' ? error.details : null,
    hint: typeof error?.hint === 'string' ? error.hint : null,
  }
}

export function formatCatalogueRefreshError(error) {
  const code = typeof error?.code === 'string' ? ` (Supabase ${error.code})` : ''
  return `Could not refresh the database catalogue${code}. Check the browser console for diagnostic details and verify catalogue migrations.`
}
