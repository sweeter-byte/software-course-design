import { useCallback, useSyncExternalStore } from 'react'

function getMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mql = window.matchMedia(query)
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', notify)
        return () => mql.removeEventListener('change', notify)
      }
      mql.addListener(notify)
      return () => mql.removeListener(notify)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => getMatch(query),
    () => false,
  )
}
