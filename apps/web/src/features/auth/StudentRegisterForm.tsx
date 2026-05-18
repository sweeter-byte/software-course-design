export type StudentRegisterFormState = {
  phone: string
  password: string
  confirmPassword: string
  username: string
  realName: string
  studentId: string
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
          <label>
            手机号
            <input
              autoComplete="tel"
              value={values.phone}
              onChange={(event) => onChange({ ...values, phone: event.target.value })}
            />
          </label>
          <label>
            学号
            <input
              value={values.studentId}
              onChange={(event) => onChange({ ...values, studentId: event.target.value })}
            />
          </label>
          <label>
            用户名
            <input
              value={values.username}
              onChange={(event) => onChange({ ...values, username: event.target.value })}
            />
          </label>
          <label>
            真实姓名
            <input
              value={values.realName}
              onChange={(event) => onChange({ ...values, realName: event.target.value })}
            />
          </label>
          <label>
            密码
            <input
              autoComplete="new-password"
              type="password"
              value={values.password}
              onChange={(event) => onChange({ ...values, password: event.target.value })}
            />
          </label>
          <label>
            确认密码
            <input
              autoComplete="new-password"
              type="password"
              value={values.confirmPassword}
              onChange={(event) =>
                onChange({ ...values, confirmPassword: event.target.value })
              }
            />
          </label>
        </div>

        <div className="inline-row">
          <label className="grow">
            验证码
            <input
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
