import { ApiError, type ValidationIssue } from '../api'

const friendlyMessages: Record<string, string> = {
  invalid_credentials: '手机号或密码不正确，请重新输入。',
  verification_code_not_found: '请先获取验证码。',
  verification_code_used: '验证码已失效，请重新获取。',
  verification_code_expired: '验证码已过期，请重新获取。',
  verification_code_invalid: '验证码不正确，请重新输入。',
  phone_already_registered: '该手机号已注册，可直接登录。',
  student_id_already_registered: '该学号已存在，请核对后重试。',
  validation_failed: '请检查填写内容后再提交。',
  already_enrolled: '你已加入该课程。',
  forbidden: '当前账号暂无此操作权限。',
  not_found: '未找到对应内容。',
  feedback_requires_grading: '该提交尚未批改，批改后才能发起作业问题或反馈。',
  feedback_locked_by_response: '教师已回复，问题/反馈不能再修改或删除。',
  submission_already_graded: '该提交已批改，不能再修改答案。',
  assignment_already_submitted: '该作业已经提交，不能重复提交。',
  assignment_deadline_passed: '作业截止时间已过，不能继续提交或修改。',
  course_enrollment_required: '请先加入课程，再进行相关操作。',
  submission_id_required: '请先选择一条提交记录。',
  account_disabled: '账号已被教务员禁用，请联系教务员恢复后再登录。',
  account_cancelled: '该账号已注销，无法继续操作。',
  cannot_modify_self: '不允许对自己执行该操作。',
  user_not_found: '未找到该账号。',
  cloudbase_verification_unavailable: '验证码服务暂时不可用，请稍后重试。',
  internal_server_error: '系统暂时繁忙，请稍后再试。',
  old_password_invalid: '旧密码不正确。',
  old_phone_invalid: '旧手机号不正确。',
  course_not_found: '未找到该课程。',
  course_full: '该课程人数已满。',
  course_code_exists: '课程代码已存在。',
  teacher_not_found: '未找到该授课教师。',
  assignment_not_found: '未找到该作业。',
  assignment_cancelled: '该作业已取消。',
  session_invalid: '登录已失效，请重新登录。',
}

const fieldLabels: Record<string, string> = {
  phone: '手机号',
  password: '密码',
  confirmPassword: '确认密码',
  newPassword: '新密码',
  oldPassword: '原密码',
  username: '用户名',
  realName: '姓名',
  studentId: '学号',
  studentNo: '学号',
  verificationCode: '验证码',
  newVerificationCode: '新手机号验证码',
  oldVerificationCode: '原手机号验证码',
  newPhone: '新手机号',
  email: '邮箱',
  gender: '性别',
  college: '学院',
  major: '专业',
  className: '班级',
  courseCode: '课程代码',
  courseName: '课程名称',
  teacherId: '授课教师',
  semester: '学期',
  location: '上课地点',
  scheduleText: '上课时间',
  capacity: '容量',
  startDate: '开始日期',
  endDate: '结束日期',
  description: '简介',
  title: '标题',
  requirement: '要求',
  startAt: '开始时间',
  dueAt: '截止时间',
  content: '内容',
  kind: '类型',
  dimension: '反馈维度',
  score: '分数',
  teacherFeedback: '教师评语',
}

function formatFieldPath(path: ValidationIssue['path']): string {
  if (path.length === 0) return ''
  const head = path[0]
  if (typeof head === 'string' && fieldLabels[head]) return fieldLabels[head]
  return path.map((segment) => String(segment)).join('.')
}

function formatValidationDetails(details: ValidationIssue[]): string | null {
  if (details.length === 0) return null
  const parts = details
    .map((issue) => {
      const label = formatFieldPath(issue.path)
      const message = issue.message?.trim()
      if (!message) return label || null
      return label ? `${label}：${message}` : message
    })
    .filter((entry): entry is string => Boolean(entry))
  if (parts.length === 0) return null
  return `请检查填写内容：${parts.join('；')}。`
}

export function friendlyErrorMessage(message: string, details?: ValidationIssue[]) {
  const normalized = message.toLowerCase()

  if (normalized.includes('network request failed') || normalized.includes('failed to fetch')) {
    return '当前无法连接系统服务，请确认网络后重试。'
  }

  if (normalized === 'validation_failed' && details && details.length > 0) {
    const formatted = formatValidationDetails(details)
    if (formatted) return formatted
  }

  return friendlyMessages[normalized] ?? '当前操作暂时无法完成，请稍后再试。'
}

/**
 * Funnel any thrown value into a user-facing Chinese string. Mirrors the
 * web client's utils/errors.ts so mobile UX matches the web UX.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}
