export type LoginFormState = {
  phone: string
  password: string
}

type LoginFormProps = {
  values: LoginFormState
  isPending: boolean
  onChange: (next: LoginFormState) => void
  onSubmit: () => void
  onForgotPassword: () => void
  onRegister: () => void
}

export function LoginForm({
  values,
  isPending,
  onChange,
  onSubmit,
  onForgotPassword,
  onRegister,
}: LoginFormProps) {
  return (
    <div className="auth-flow">
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label>
          手机号
          <input
            autoComplete="username"
            value={values.phone}
            onChange={(event) => onChange({ ...values, phone: event.target.value })}
          />
        </label>
        <label>
          密码
          <input
            autoComplete="current-password"
            type="password"
            value={values.password}
            onChange={(event) => onChange({ ...values, password: event.target.value })}
          />
        </label>
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? '登录中...' : '进入工作台'}
        </button>
      </form>

      <div className="auth-entry-row">
        <button className="link-button" type="button" onClick={onForgotPassword}>
          忘记密码？
        </button>
        <span>还没有学生账号？</span>
        <button className="link-button" type="button" onClick={onRegister}>
          学生注册
        </button>
      </div>
    </div>
  )
}
