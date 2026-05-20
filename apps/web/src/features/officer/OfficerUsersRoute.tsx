import { NavLink, Outlet } from 'react-router-dom'

const TABS: Array<{ to: string; label: string; description: string }> = [
  {
    to: 'students',
    label: '学生账号',
    description: '查看学生账号，按需禁用 / 恢复。',
  },
  {
    to: 'teachers',
    label: '教师账号',
    description: '查看教师账号，按需禁用 / 恢复。账号由系统管理员预置。',
  },
  {
    to: 'officers',
    label: '教务员账号',
    description: '只读查看教务员账号列表。',
  },
]

export function OfficerUsersRoute() {
  return (
    <section className="officer-users-route">
      <header className="course-workspace-head">
        <div className="course-workspace-title">
          <p className="eyebrow">用户管理</p>
          <h3>账号列表与启停</h3>
        </div>
      </header>

      <nav className="course-workspace-tabs" aria-label="用户管理子 Tab">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="course-workspace-body">
        <Outlet />
      </div>
    </section>
  )
}
