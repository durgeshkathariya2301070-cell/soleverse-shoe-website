import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchPublicCatalogue } from '../services/catalogueService.js'
import { publicSampleProducts } from '../data/products.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

const CatalogueContext = createContext(null)

export function CatalogueProvider({ children }) {
  const [catalogue, setCatalogue] = useState({
    products: isSupabaseConfigured ? [] : publicSampleProducts,
    status: isSupabaseConfigured ? 'loading' : 'sample',
    error: '',
  })

  const refreshCatalogue = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const result = await fetchPublicCatalogue()
    setCatalogue({
      products: result.products,
      status: result.error ? 'error' : result.source,
      error: result.error ?? '',
    })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    void refreshCatalogue()
  }, [refreshCatalogue])

  const value = useMemo(() => ({ ...catalogue, refreshCatalogue }), [catalogue, refreshCatalogue])
  return <CatalogueContext.Provider value={value}>
    {catalogue.error && (
      <div className="container-page pt-4">
        <p className="rounded-xl border border-amber-300 bg-white p-3 text-sm text-ink" role="status">{catalogue.error} Showing the existing sample catalogue for now.</p>
      </div>
    )}
    {children}
  </CatalogueContext.Provider>
}

export function useCatalogue() {
  const value = useContext(CatalogueContext)
  if (!value) throw new Error('useCatalogue must be used inside <CatalogueProvider>')
  return value
}
