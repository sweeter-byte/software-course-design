import { StatePanel } from '../../components/ui/StatePanel'
import type { AdminUserItem, UserRole } from '../../domain'

type RoleFilter = '' | UserRole

const roleLabels: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const statusLabels: Record<AdminUserItem['status'], string> = {
  active: '正常',
  disabled: '已禁用',
  cancelled: '已注销',
}

type UserAdminSectionProps = {
  users: AdminUserItem[]
  roleFilter: RoleFilter
  isLoading: boolean
  isToggling: boolean
  currentUserId: string
  pendingUserId: string | null
  onRoleFilterChange: (value: RoleFilter) => void
  onToggle: (user: AdminUserItem) => void
}

export function UserAdminSection({
  users,
  roleFilter,
  isLoading,
  isToggling,
  currentUserId,
  pendingUserId,
  onRoleFilterChange,
  onToggle,
}: UserAdminSectionProps) {
  return (
    <div className="user-admin">
      <div className="form-grid">
        <label htmlFor="user-admin-role-filter">
          角色筛选
          <select
            id="user-admin-role-filter"
            name="role"
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
          >
            <option value="">全部角色</option>
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="officer">教务员</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <StatePanel title="用户数据加载中" detail="正在同步全部账号信息。" />
      ) : users.length === 0 ? (
        <StatePanel title="没有匹配的账号" detail="可以调整角色筛选，或先在系统内添加账号。" />
      ) : (
        <div className="entity-list user-admin-list">
          {users.map((user) => {
            const isSelf = user.id === currentUserId
            const isCancelled = user.status === 'cancelled'
            const isDisabled = user.status === 'disabled'
            const togglePending = pendingUserId === user.id && isToggling
            const buttonLabel = togglePending
              ? '处理中...'
              : isDisabled
                ? '恢复'
                : '禁用'

            return (
              <article
                key={user.id}
                className={`entity-card user-admin-card status-${user.status}`}
              >
                <div className="user-admin-meta">
                  <strong>
                    {user.realName}（{user.username}）
                  </strong>
                  <span className="status-tag">{roleLabels[user.role]}</span>
                  <span className={`status-tag status-${user.status}`}>
                    {statusLabels[user.status]}
                  </span>
                </div>
                <p>
                  手机号：{user.phone}
                  {user.studentNo ? ` · 学号 ${user.studentNo}` : ''}
                  {user.teacherNo ? ` · 工号 ${user.teacherNo}` : ''}
                </p>
                {user.email || user.college || user.major ? (
                  <small>
                    {[
                      user.email ? `邮箱 ${user.email}` : null,
                      user.college,
                      user.major,
                    ]
                      .filter((entry): entry is string => Boolean(entry))
                      .join(' · ')}
                  </small>
                ) : null}
                <div className="inline-row">
                  <button
                    className={isDisabled ? 'ghost-button' : 'danger-button'}
                    type="button"
                    disabled={isSelf || isCancelled || togglePending}
                    onClick={() => onToggle(user)}
                  >
                    {buttonLabel}
                  </button>
                  {isSelf ? <small className="muted-paragraph">不能对自己执行启停</small> : null}
                  {isCancelled ? <small className="muted-paragraph">注销账号不支持启停</small> : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
