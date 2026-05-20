import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AdminUserItem, UserRole } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { friendlyErrorMessage } from '../../utils/errors'

const ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const STATUS_LABELS: Record<AdminUserItem['status'], string> = {
  active: '正常',
  disabled: '已禁用',
  cancelled: '已注销',
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '已禁用' },
  { value: 'cancelled', label: '已注销' },
]

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}

interface OfficerUsersTabProps {
  role: UserRole
  showStatusToggle: boolean
  description: string
  identityFieldLabel: '学号' | '工号' | '账号'
}

export function OfficerUsersTab({
  role,
  showStatusToggle,
  description,
  identityFieldLabel,
}: OfficerUsersTabProps) {
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery<{ users: AdminUserItem[] }>({
    queryKey: ['adminUsers', apiBaseUrl, session.accessToken, role],
    queryFn: async () => {
      const payload = await api.listAdminUsers(apiBaseUrl, session.accessToken, role)
      return { users: payload.users as AdminUserItem[] }
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (variables: { user: AdminUserItem; disabled: boolean }) => {
      setPendingUserId(variables.user.id)
      return api.setUserDisabled(
        apiBaseUrl,
        session.accessToken,
        variables.user.id,
        variables.disabled,
      )
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
    onSettled: () => setPendingUserId(null),
  })

  const filtered = useMemo(() => {
    const users = usersQuery.data?.users ?? []
    const keywordLower = keyword.trim().toLowerCase()
    return users.filter((user) => {
      if (statusFilter && user.status !== statusFilter) return false
      if (!keywordLower) return true
      const fields = [
        user.realName,
        user.username,
        user.phone,
        user.studentNo,
        user.teacherNo,
      ]
      return fields.some((value) => value && value.toLowerCase().includes(keywordLower))
    })
  }, [usersQuery.data, keyword, statusFilter])

  return (
    <div className="course-tab-content">
      {error ? <p className="error-banner">{error}</p> : null}
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>{ROLE_LABELS[role]}账号</h3>
          <p>{description}</p>
        </div>
        <div className="form-grid">
          <label htmlFor={`${role}-keyword`}>
            搜索
            <input
              id={`${role}-keyword`}
              placeholder={`按姓名 / ${identityFieldLabel} / 手机号搜索`}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label htmlFor={`${role}-status`}>
            账号状态
            <select
              id={`${role}-status`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {usersQuery.isLoading ? (
          <StatePanel title="账号加载中" detail="正在同步账号信息。" />
        ) : filtered.length === 0 ? (
          <StatePanel title="没有匹配的账号" detail="可以调整搜索条件或筛选状态。" />
        ) : (
          <div className="entity-list user-admin-list">
            {filtered.map((user) => {
              const isSelf = user.id === session.user.id
              const isCancelled = user.status === 'cancelled'
              const isDisabled = user.status === 'disabled'
              const togglePending = pendingUserId === user.id && toggleMutation.isPending
              return (
                <article
                  key={user.id}
                  className={`entity-card user-admin-card status-${user.status}`}
                >
                  <div className="user-admin-meta">
                    <strong>
                      {user.realName}（{user.username}）
                    </strong>
                    <span className={`status-tag status-${user.status}`}>
                      {STATUS_LABELS[user.status]}
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
                  {showStatusToggle ? (
                    <div className="inline-row">
                      <button
                        className={isDisabled ? 'ghost-button' : 'danger-button'}
                        type="button"
                        disabled={isSelf || isCancelled || togglePending}
                        onClick={() => {
                          const nextDisabled = !isDisabled
                          const message = nextDisabled
                            ? `确认禁用 ${user.realName} 的账号吗？禁用后该账号无法登录。`
                            : `确认恢复 ${user.realName} 的账号吗？恢复后该账号可立即登录。`
                          if (confirmDestructive(message)) {
                            toggleMutation.mutate({ user, disabled: nextDisabled })
                          }
                        }}
                      >
                        {togglePending ? '处理中...' : isDisabled ? '恢复' : '禁用'}
                      </button>
                      {isSelf ? (
                        <small className="muted-paragraph">不能对自己执行启停</small>
                      ) : null}
                      {isCancelled ? (
                        <small className="muted-paragraph">注销账号不支持启停</small>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </article>
    </div>
  )
}
