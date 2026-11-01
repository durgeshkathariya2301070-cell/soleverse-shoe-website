import { useEffect, useState } from 'react'

// Checks whether a 3D model file really exists before we load any heavy 3D code.
// Returns one of:
//   'none'      no model path was given
//   'checking'  the check is running
//   'available' the file exists
//   'missing'   the file is not there (404, network error, or the dev server answered with a web page)
//
// Vite answers unknown URLs with index.html, so a "200 OK" whose type is text/html also counts as missing.
export function useModelAvailability(modelPath) {
  const [result, setResult] = useState({ path: null, status: 'none' })

  useEffect(() => {
    if (!modelPath) return undefined

    const controller = new AbortController()
    fetch(modelPath, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        const type = response.headers.get('content-type') ?? ''
        const isRealFile = response.ok && !type.includes('text/html')
        setResult({ path: modelPath, status: isRealFile ? 'available' : 'missing' })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ path: modelPath, status: 'missing' })
      })

    return () => controller.abort()
  }, [modelPath])

  if (!modelPath) return 'none'
  return result.path === modelPath ? result.status : 'checking'
}
