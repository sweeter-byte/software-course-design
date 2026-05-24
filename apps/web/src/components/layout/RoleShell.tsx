import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useMediaQuery } from '../../hooks/useMediaQuery'
import { SidebarDrawer } from './SidebarDrawer'
import { NotificationStack } from '../notifications/NotificationStack'
import type { UserRole } from '../../domain'
import type { Notification } from '../../hooks/useNotifications'

export interface RoleShellNavItem {
  to: string
  label: string
  hint: string
}

export interface RoleShellUser {
  realName: string
  username: string
  phone: string
  role: UserRole
}

export interface RoleShellProps {
  user: RoleShellUser
  roleLabel: string
  pageTitle: string
  roleDescription: string
  navItems: RoleShellNavItem[]
  guideTip: string
  notifications: Notification[]
  onDismissNotification: (id: number) => void
  onLogout: () => void
  isLoggingOut: boolean
  children: ReactNode
}

export function RoleShell(props: RoleShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const isCompactViewport = useMediaQuery('(max-width: 840px)')
  const isDrawerOpen = isCompactViewport && isMobileNavOpen

  const sidebarBody = (
    <>
      <div className="sidebar-brand">
        <div className="brand-crest">
          <span>航</span>
        </div>
        <div>
          <h1>课程互动管理系统</h1>
          <p>{props.roleLabel}端</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="功能导航">
        {props.navItems.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <button
              key={item.to}
              className={isActive ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => {
                navigate(item.to)
                if (isCompactViewport) {
                  setIsMobileNavOpen(false)
                }
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.label.slice(0, 1)}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="service-dot" />
        <p>平台运行正常</p>
      </div>
      <div className="sidebar-guide">
        <strong>使用指引</strong>
        <p>{props.guideTip}</p>
      </div>
    </>
  )

  return (
    <div className={`page-shell${isCompactViewport ? ' page-shell-compact' : ''}`}>
      {isCompactViewport ? (
        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsMobileNavOpen(false)}
          ariaLabel="功能导航"
        >
          {sidebarBody}
        </SidebarDrawer>
      ) : (
        <aside className="brand-rail app-sidebar">{sidebarBody}</aside>
      )}

      <main className="workspace">
        <header className="workspace-head">
          {isCompactViewport ? (
            <button
              type="button"
              className="hamburger-button"
              aria-label="打开功能导航"
              aria-expanded={isDrawerOpen}
              aria-controls="sidebar-drawer"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <span className="hamburger-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          ) : null}
          <div className="workspace-title-block">
            <p className="eyebrow">课程互动管理系统</p>
            <h2>{props.pageTitle}</h2>
            <p className="workspace-subcopy">{props.roleDescription}</p>
          </div>

          <div className="api-field">
            <span>{props.user.realName}</span>
            <strong>{props.roleLabel}</strong>
            <div className="service-pill">
              <span className="service-dot" />
              在线
            </div>
          </div>

          <button
            className="ghost-button"
            type="button"
            onClick={props.onLogout}
            disabled={props.isLoggingOut}
          >
            {props.isLoggingOut ? '退出中...' : '退出会话'}
          </button>
        </header>

        <NotificationStack
          notifications={props.notifications}
          onDismiss={props.onDismissNotification}
        />

        {props.children}
      </main>
    </div>
  )
}
