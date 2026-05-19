import { useCallback, useEffect, useReducer, useRef } from 'react'

export type NotificationType = 'info' | 'success' | 'error'

export type Notification = {
  id: number
  type: NotificationType
  content: string
}

export type NotifyInput = {
  type: NotificationType
  content: string
  ttl?: number | null
}

const DEFAULT_TTL: Record<NotificationType, number> = {
  info: 5000,
  success: 5000,
  error: 8000,
}

type Action =
  | { type: 'add'; item: Notification }
  | { type: 'remove'; id: number }

function reducer(state: Notification[], action: Action): Notification[] {
  switch (action.type) {
    case 'add':
      return [...state, action.item]
    case 'remove':
      return state.filter((item) => item.id !== action.id)
    default:
      return state
  }
}

export type UseNotificationsResult = {
  notifications: Notification[]
  notify: (input: NotifyInput) => number
  dismiss: (id: number) => void
  clear: () => void
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, dispatch] = useReducer(reducer, [])
  const idRef = useRef(0)
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    dispatch({ type: 'remove', id })
  }, [])

  const notify = useCallback((input: NotifyInput): number => {
    idRef.current += 1
    const id = idRef.current
    dispatch({
      type: 'add',
      item: { id, type: input.type, content: input.content },
    })

    const ttl = input.ttl === undefined ? DEFAULT_TTL[input.type] : input.ttl
    if (ttl !== null && ttl > 0) {
      const timer = setTimeout(() => {
        timersRef.current.delete(id)
        dispatch({ type: 'remove', id })
      }, ttl)
      timersRef.current.set(id, timer)
    }
    return id
  }, [])

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.clear()
    for (const item of notifications) {
      dispatch({ type: 'remove', id: item.id })
    }
  }, [notifications])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return { notifications, notify, dismiss, clear }
}
