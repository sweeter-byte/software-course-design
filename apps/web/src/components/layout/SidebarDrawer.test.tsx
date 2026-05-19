import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SidebarDrawer } from './SidebarDrawer'

describe('SidebarDrawer', () => {
  it('renders nothing when closed', () => {
    const onClose = vi.fn()
    render(
      <SidebarDrawer isOpen={false} onClose={onClose}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders children inside a labelled dialog when open', () => {
    render(
      <SidebarDrawer isOpen onClose={vi.fn()} ariaLabel="导航">
        <a href="/dashboard">工作台</a>
      </SidebarDrawer>,
    )
    const dialog = screen.getByRole('dialog', { name: '导航' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('link', { name: '工作台' })).toBeInTheDocument()
  })

  it('invokes onClose when the overlay is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <SidebarDrawer isOpen onClose={onClose}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    await user.click(screen.getByRole('button', { name: '关闭导航抽屉' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <SidebarDrawer isOpen onClose={onClose}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not listen for Escape when closed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <SidebarDrawer isOpen={false} onClose={onClose}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = 'auto'
    const { rerender, unmount } = render(
      <SidebarDrawer isOpen onClose={vi.fn()}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <SidebarDrawer isOpen={false} onClose={vi.fn()}>
        <a href="/">链接</a>
      </SidebarDrawer>,
    )
    expect(document.body.style.overflow).toBe('auto')

    unmount()
  })
})
