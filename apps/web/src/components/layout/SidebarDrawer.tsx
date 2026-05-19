import { useEffect, type ReactNode } from 'react'

type SidebarDrawerProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
}

export function SidebarDrawer({
  isOpen,
  onClose,
  children,
  ariaLabel = '功能导航抽屉',
}: SidebarDrawerProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="sidebar-drawer" role="presentation">
      <button
        type="button"
        className="sidebar-drawer-overlay"
        aria-label="关闭导航抽屉"
        onClick={onClose}
      />
      <aside
        id="sidebar-drawer"
        className="sidebar-drawer-panel brand-rail app-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </aside>
    </div>
  )
}
