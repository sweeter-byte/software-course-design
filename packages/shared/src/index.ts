import { z } from 'zod'

export const loginSchema = z.object({
  phone: z.string().min(11, '请输入手机号'),
  password: z.string().min(6, '密码至少 6 位'),
})

export const verificationCodeRequestSchema = z.object({
  phone: z.string().min(11, '请输入手机号'),
  purpose: z.enum(['register', 'reset_password', 'change_phone']),
})

export const passwordForgotSchema = z
  .object({
    phone: z.string().min(11, '请输入手机号'),
    verificationCode: z.string().min(4, '请输入验证码'),
    newPassword: z.string().min(6, '新密码至少 6 位'),
    confirmPassword: z.string().min(6, '确认密码至少 6 位'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export const passwordChangeSchema = z
  .object({
    oldPassword: z.string().min(6, '请输入旧密码'),
    newPassword: z.string().min(6, '新密码至少 6 位'),
    confirmPassword: z.string().min(6, '确认密码至少 6 位'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export const phoneChangeSchema = z
  .object({
    oldPhone: z.string().min(11, '请输入旧手机号'),
    oldVerificationCode: z.string().min(4, '请输入旧手机号验证码'),
    newPhone: z.string().min(11, '请输入新手机号'),
    newVerificationCode: z.string().min(4, '请输入新手机号验证码'),
  })
  .refine((value) => value.oldPhone !== value.newPhone, {
    message: '新手机号不能与旧手机号相同',
    path: ['newPhone'],
  })

export const profileUpdateSchema = z
  .object({
    username: z.string().min(2, '用户名至少 2 位').optional(),
    realName: z.string().min(2, '真实姓名至少 2 位').optional(),
    email: z.string().email('邮箱格式不正确').nullable().optional(),
    gender: z.string().nullable().optional(),
    college: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    className: z.string().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '请至少提供一项资料',
  })

export const studentRegisterSchema = z
  .object({
    phone: z.string().min(11, '请输入手机号'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string().min(6, '确认密码至少 6 位'),
    username: z.string().min(2, '用户名至少 2 位'),
    realName: z.string().min(2, '真实姓名至少 2 位'),
    studentId: z.string().min(4, '请输入学号'),
    verificationCode: z.string().min(4, '请输入验证码'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export const assignmentDraftSchema = z.object({
  title: z.string().min(2, '作业标题至少 2 位'),
  description: z.string().min(2, '作业描述至少 2 位'),
  requirement: z.string().min(2, '作业要求至少 2 位'),
  startAt: z.string(),
  dueAt: z.string(),
})

export const assignmentUpdateSchema = assignmentDraftSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: '请至少提供一项作业信息',
  })

export const assignmentCancelSchema = z.object({
  reason: z.string().min(2, '请输入取消原因'),
})

export const courseCreateSchema = z.object({
  courseCode: z.string().min(2, '请输入课程代码'),
  courseName: z.string().min(2, '请输入课程名称'),
  teacherId: z.string().min(2, '请选择授课教师'),
  semester: z.string().min(2, '请输入开课学期'),
  description: z.string().min(2, '请输入课程简介'),
  location: z.string().min(2, '请输入授课地点'),
  scheduleText: z.string().min(2, '请输入上课时间'),
  capacity: z.number().int().positive('课程人数上限必须为正整数'),
  startDate: z.string().min(2, '请输入开课日期'),
  endDate: z.string().min(2, '请输入结课日期'),
})

export const courseUpdateSchema = courseCreateSchema
  .partial()
  .extend({
    status: z.enum(['not_started', 'active', 'completed', 'suspended']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '请至少提供一项课程信息',
  })

export const submissionSchema = z.object({
  content: z.string().min(2, '答案内容至少 2 位'),
})

export const submissionGradeSchema = z.object({
  score: z.number().min(0, '分数不能小于 0').max(100, '分数不能大于 100'),
  teacherFeedback: z.string().min(2, '请输入批改意见'),
})

export const feedbackSchema = z.object({
  kind: z.enum(['question', 'feedback']),
  content: z.string().min(2, '请输入内容'),
})

export const courseFeedbackSchema = z.object({
  dimension: z.enum(['content', 'method', 'teaching', 'gain', 'other']),
  content: z.string().min(2, '请输入课程反馈内容'),
})

export const responseSchema = z.object({
  content: z.string().min(2, '请输入回复内容'),
})

export const userStatusUpdateSchema = z.object({
  disabled: z.boolean({
    required_error: '请提供禁用状态',
    invalid_type_error: '禁用状态必须为布尔值',
  }),
})

export const userListQuerySchema = z.object({
  role: z.enum(['student', 'teacher', 'officer']).optional(),
})

export const roleLabelMap = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
} as const
