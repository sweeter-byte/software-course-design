export type ResetPasswordFormState = {
  phone: string
  verificationCode: string
  newPassword: string
  confirmPassword: string
}

type ResetPasswordFormProps = {
  values: ResetPasswordFormState
  isRequestingCode: boolean
  isSubmitting: boolean
  onChange: (next: ResetPasswordFormState) => void
  onRequestCode: () => void
  onSubmit: () => void
  onBackToLogin: () => void
}

export function ResetPasswordForm({
  values,
  isRequestingCode,
  isSubmitting,
  onChange,
  onRequestCode,
  onSubmit,
  onBackToLogin,
}: ResetPasswordFormProps) {
  return (
    <div className="auth-flow">
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <p className="muted-paragraph">忘记密码时，可通过手机号验证码重置。</p>
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
            验证码
            <input
              autoComplete="one-time-code"
              value={values.verificationCode}
              onChange={(event) =>
                onChange({ ...values, verificationCode: event.target.value })
              }
            />
          </label>
          <label>
            新密码
            <input
              autoComplete="new-password"
              type="password"
              value={values.newPassword}
              onChange={(event) =>
                onChange({ ...values, newPassword: event.target.value })
              }
            />
          </label>
          <label>
            确认新密码
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
          <button
            className="ghost-button"
            type="button"
            onClick={onRequestCode}
            disabled={isRequestingCode}
          >
            {isRequestingCode ? '发送中...' : '获取重置验证码'}
          </button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '重置中...' : '重置密码'}
          </button>
        </div>
      </form>

      <div className="auth-entry-row">
        <span>已完成重置或想起密码？</span>
        <button className="link-button" type="button" onClick={onBackToLogin}>
          返回账号登录
        </button>
      </div>
    </div>
  )
}
