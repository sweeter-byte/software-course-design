import { PasswordInput } from '../../components/ui/PasswordInput'

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
      <input autoComplete="username" hidden readOnly value={phone} name="phone" />
      <div className="form-grid">
        <label htmlFor="account-old-password">
          旧密码
          <PasswordInput
            id="account-old-password"
            name="oldPassword"
            autoComplete="current-password"
            required
            minLength={6}
            title="请输入旧密码"
            value={values.oldPassword}
            onChange={(event) => onChange({ ...values, oldPassword: event.target.value })}
          />
        </label>
        <label htmlFor="account-new-password">
          新密码
          <PasswordInput
            id="account-new-password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={6}
            title="新密码至少 6 位"
            value={values.newPassword}
            onChange={(event) => onChange({ ...values, newPassword: event.target.value })}
          />
        </label>
        <label htmlFor="account-confirm-password">
          确认新密码
          <PasswordInput
            id="account-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={6}
            title="请再次输入新密码"
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
