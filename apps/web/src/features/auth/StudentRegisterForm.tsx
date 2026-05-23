import { PasswordInput } from '../../components/ui/PasswordInput'

export type StudentRegisterFormState = {
  phone: string
  password: string
  confirmPassword: string
  username: string
  realName: string
  studentId: string
  email: string
  gender: string
  college: string
  major: string
  className: string
  verificationCode: string
}

type StudentRegisterFormProps = {
  values: StudentRegisterFormState
  isRequestingCode: boolean
  isSubmitting: boolean
  onChange: (next: StudentRegisterFormState) => void
  onRequestCode: () => void
  onSubmit: () => void
  onBackToLogin: () => void
}

export function StudentRegisterForm({
  values,
  isRequestingCode,
  isSubmitting,
  onChange,
  onRequestCode,
  onSubmit,
  onBackToLogin,
}: StudentRegisterFormProps) {
  return (
    <div className="auth-flow">
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="form-grid">
          <label htmlFor="register-phone">
            手机号
            <input
              id="register-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              minLength={11}
              maxLength={11}
              pattern="\d{11}"
              title="请输入 11 位手机号"
              value={values.phone}
              onChange={(event) => onChange({ ...values, phone: event.target.value })}
            />
          </label>
          <label htmlFor="register-student-id">
            学号
            <input
              id="register-student-id"
              name="studentId"
              inputMode="numeric"
              autoComplete="off"
              required
              minLength={4}
              title="学号至少 4 位"
              value={values.studentId}
              onChange={(event) => onChange({ ...values, studentId: event.target.value })}
            />
          </label>
          <label htmlFor="register-username">
            用户名
            <input
              id="register-username"
              name="username"
              autoComplete="nickname"
              required
              minLength={2}
              title="用户名至少 2 位"
              value={values.username}
              onChange={(event) => onChange({ ...values, username: event.target.value })}
            />
          </label>
          <label htmlFor="register-real-name">
            真实姓名
            <input
              id="register-real-name"
              name="realName"
              autoComplete="name"
              required
              minLength={2}
              title="真实姓名至少 2 位"
              value={values.realName}
              onChange={(event) => onChange({ ...values, realName: event.target.value })}
            />
          </label>
          <label htmlFor="register-email">
            邮箱
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => onChange({ ...values, email: event.target.value })}
            />
          </label>
          <label htmlFor="register-gender">
            性别
            <select
              id="register-gender"
              name="gender"
              value={values.gender}
              onChange={(event) => onChange({ ...values, gender: event.target.value })}
            >
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </label>
          <label htmlFor="register-college">
            学院
            <input
              id="register-college"
              name="college"
              autoComplete="organization"
              value={values.college}
              onChange={(event) => onChange({ ...values, college: event.target.value })}
            />
          </label>
          <label htmlFor="register-major">
            专业
            <input
              id="register-major"
              name="major"
              autoComplete="off"
              value={values.major}
              onChange={(event) => onChange({ ...values, major: event.target.value })}
            />
          </label>
          <label htmlFor="register-class-name">
            班级
            <input
              id="register-class-name"
              name="className"
              autoComplete="off"
              value={values.className}
              onChange={(event) => onChange({ ...values, className: event.target.value })}
            />
          </label>
          <label htmlFor="register-password">
            密码
            <PasswordInput
              id="register-password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              title="密码至少 6 位"
              value={values.password}
              onChange={(event) => onChange({ ...values, password: event.target.value })}
            />
          </label>
          <label htmlFor="register-confirm-password">
            确认密码
            <PasswordInput
              id="register-confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={6}
              title="请再次输入密码"
              value={values.confirmPassword}
              onChange={(event) =>
                onChange({ ...values, confirmPassword: event.target.value })
              }
            />
          </label>
        </div>

        <div className="inline-row">
          <label className="grow" htmlFor="register-verification-code">
            验证码
            <input
              id="register-verification-code"
              name="verificationCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={4}
              maxLength={6}
              title="请输入收到的验证码"
              value={values.verificationCode}
              onChange={(event) =>
                onChange({ ...values, verificationCode: event.target.value })
              }
            />
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={onRequestCode}
            disabled={isRequestingCode}
          >
            {isRequestingCode ? '发送中...' : '获取验证码'}
          </button>
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? '注册中...' : '完成注册'}
        </button>
      </form>

      <div className="auth-entry-row">
        <span>已有账号？</span>
        <button className="link-button" type="button" onClick={onBackToLogin}>
          返回账号登录
        </button>
      </div>
    </div>
  )
}
