export type PasswordFormState = {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

type PasswordFormProps = {
  values: PasswordFormState
  phone: string
  isPending: boolean
  isCancelling: boolean
  onChange: (next: PasswordFormState) => void
  onSubmit: () => void
  onCancelAccount: () => void
}

export function PasswordForm({
  values,
  phone,
  isPending,
  isCancelling,
  onChange,
  onSubmit,
  onCancelAccount,
}: PasswordFormProps) {
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <input autoComplete="username" hidden readOnly value={phone} />
      <div className="form-grid">
        <label>
          旧密码
          <input
            autoComplete="current-password"
            type="password"
            value={values.oldPassword}
            onChange={(event) => onChange({ ...values, oldPassword: event.target.value })}
          />
        </label>
        <label>
          新密码
          <input
            autoComplete="new-password"
            type="password"
            value={values.newPassword}
            onChange={(event) => onChange({ ...values, newPassword: event.target.value })}
          />
        </label>
        <label>
          确认新密码
          <input
            autoComplete="new-password"
            type="password"
            value={values.confirmPassword}
            onChange={(event) => onChange({ ...values, confirmPassword: event.target.value })}
          />
        </label>
      </div>
      <div className="inline-row">
        <button className="ghost-button" type="submit" disabled={isPending}>
          {isPending ? '修改中...' : '修改密码'}
        </button>
        <button
          className="danger-button"
          type="button"
          onClick={onCancelAccount}
          disabled={isCancelling}
        >
          {isCancelling ? '注销中...' : '注销账号'}
        </button>
      </div>
    </form>
  )
}
