import { useEffect } from 'react'

const DEFAULT_TITLE = 'SOLEVERSE — Step into your next dimension'

// Sets the browser tab title for the current page.
// usePageTitle('Shop') -> "Shop — SOLEVERSE". Call with no argument for the default title.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — SOLEVERSE` : DEFAULT_TITLE
  }, [title])
}
