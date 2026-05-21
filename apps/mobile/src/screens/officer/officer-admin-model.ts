import type { AdminUserItem, CourseFeedbackDimension, CourseFeedbackItem, UserRole } from '../../domain'

export const ADMIN_STATUS_LABELS: Record<AdminUserItem['status'], string> = {
  active: '正常',
  disabled: '已禁用',
  cancelled: '已注销',
}

export const ADMIN_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '全部' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '已禁用' },
  { value: 'cancelled', label: '已注销' },
]

export const ADMIN_ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

export type AdminTabConfig = {
  role: UserRole
  label: string
  identityField: '学号' | '工号' | '账号'
  showStatusToggle: boolean
  description: string
}

export const ADMIN_TABS: ReadonlyArray<AdminTabConfig> = [
  {
    role: 'student',
    label: '学生',
    identityField: '学号',
    showStatusToggle: true,
    description: '学生账号由学生自助注册。',
  },
  {
    role: 'teacher',
    label: '教师',
    identityField: '工号',
    showStatusToggle: true,
    description: '教师账号由系统管理员通过 seed 预置，不在此处创建。',
  },
  {
    role: 'officer',
    label: '教务员',
    identityField: '账号',
    showStatusToggle: false,
    description: '教务员账号由系统管理员通过 seed 预置，仅做只读查看。',
  },
]

/**
 * Apply keyword + status filters to the admin user list. The keyword is
 * matched against realName / username / phone / studentNo / teacherNo,
 * case-insensitive (mirrors Web `OfficerUsersTab.tsx`).
 */
export function filterAdminUsers(
  users: AdminUserItem[],
  filters: { keyword: string; status: string },
): AdminUserItem[] {
  const keywordLower = filters.keyword.trim().toLowerCase()
  return users.filter((user) => {
    if (filters.status && user.status !== filters.status) return false
    if (!keywordLower) return true
    const fields = [user.realName, user.username, user.phone, user.studentNo, user.teacherNo]
    return fields.some((value) => value && value.toLowerCase().includes(keywordLower))
  })
}

export type UserActionState = {
  /** Currently toggle the account to "disabled". When false the action is a "recover". */
  nextDisabled: boolean
  /** Whether the user can actually invoke the action. */
  canAct: boolean
  /** Why the button is disabled. Null when the button is enabled. */
  blockReason: string | null
  actionLabel: string
  confirmMessage: string
}

/**
 * Mirrors Web `OfficerUsersTab` rules: self / cancelled accounts cannot be
 * toggled. Returns the next disabled flag and a human-readable explanation
 * for use in the row + the Alert confirm prompt.
 */
export function evaluateUserToggle(
  user: AdminUserItem,
  selfUserId: string,
): UserActionState {
  const isSelf = user.id === selfUserId
  const isCancelled = user.status === 'cancelled'
  const isDisabled = user.status === 'disabled'
  const nextDisabled = !isDisabled

  if (isSelf) {
    return {
      nextDisabled,
      canAct: false,
      blockReason: '不能对自己执行启停',
      actionLabel: '禁用',
      confirmMessage: '',
    }
  }
  if (isCancelled) {
    return {
      nextDisabled,
      canAct: false,
      blockReason: '注销账号不支持启停',
      actionLabel: '禁用',
      confirmMessage: '',
    }
  }

  return {
    nextDisabled,
    canAct: true,
    blockReason: null,
    actionLabel: isDisabled ? '恢复' : '禁用',
    confirmMessage: isDisabled
      ? `确认恢复 ${user.realName} 的账号吗？恢复后该账号可立即登录。`
      : `确认禁用 ${user.realName} 的账号吗？禁用后该账号无法登录。`,
  }
}

export const DIMENSION_LABELS: Record<CourseFeedbackDimension, string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

export const DIMENSION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '全部维度' },
  { value: 'content', label: '课程内容' },
  { value: 'method', label: '教学方法' },
  { value: 'teaching', label: '教师授课' },
  { value: 'gain', label: '学习收获' },
  { value: 'other', label: '其他建议' },
]

export function filterGlobalCourseFeedbacks(
  items: CourseFeedbackItem[],
  dimensionFilter: string,
): CourseFeedbackItem[] {
  if (!dimensionFilter) return items
  return items.filter((item) => item.dimension === dimensionFilter)
}
