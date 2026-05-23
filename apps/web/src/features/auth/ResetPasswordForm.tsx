import { PasswordInput } from '../../components/ui/PasswordInput'

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
          <label htmlFor="reset-phone">
            手机号
            <input
              id="reset-phone"
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
          <label htmlFor="reset-verification-code">
            验证码
            <input
              id="reset-verification-code"
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
          <label htmlFor="reset-new-password">
            新密码
            <PasswordInput
              id="reset-new-password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={6}
              title="新密码至少 6 位"
              value={values.newPassword}
              onChange={(event) =>
                onChange({ ...values, newPassword: event.target.value })
              }
            />
          </label>
          <label htmlFor="reset-confirm-password">
            确认新密码
            <PasswordInput
              id="reset-confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={6}
              title="请再次输入新密码"
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
