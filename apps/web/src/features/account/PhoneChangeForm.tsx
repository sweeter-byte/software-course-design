export type PhoneChangeFormState = {
  oldPhone: string
  oldVerificationCode: string
  newPhone: string
  newVerificationCode: string
}

type PhoneChangeFormProps = {
  values: PhoneChangeFormState
  isCodePending: boolean
  isPending: boolean
  onChange: (next: PhoneChangeFormState) => void
  onRequestCode: (target: 'old' | 'new') => void
  onSubmit: () => void
}

export function PhoneChangeForm({
  values,
  isCodePending,
  isPending,
  onChange,
  onRequestCode,
  onSubmit,
}: PhoneChangeFormProps) {
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="form-grid">
        <label htmlFor="account-old-phone">
          旧手机号
          <input
            id="account-old-phone"
            name="oldPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            minLength={11}
            maxLength={11}
            pattern="\d{11}"
            title="请输入 11 位旧手机号"
            value={values.oldPhone}
            onChange={(event) => onChange({ ...values, oldPhone: event.target.value })}
          />
        </label>
        <label htmlFor="account-old-verification-code">
          旧手机号验证码
          <input
            id="account-old-verification-code"
            name="oldVerificationCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={4}
            maxLength={6}
            title="请输入旧手机号收到的验证码"
            value={values.oldVerificationCode}
            onChange={(event) =>
              onChange({ ...values, oldVerificationCode: event.target.value })
            }
          />
        </label>
        <label htmlFor="account-new-phone">
          新手机号
          <input
            id="account-new-phone"
            name="newPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            minLength={11}
            maxLength={11}
            pattern="\d{11}"
            title="请输入 11 位新手机号"
            value={values.newPhone}
            onChange={(event) => onChange({ ...values, newPhone: event.target.value })}
          />
        </label>
        <label htmlFor="account-new-verification-code">
          新手机号验证码
          <input
            id="account-new-verification-code"
            name="newVerificationCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={4}
            maxLength={6}
            title="请输入新手机号收到的验证码"
            value={values.newVerificationCode}
            onChange={(event) =>
              onChange({ ...values, newVerificationCode: event.target.value })
            }
          />
        </label>
      </div>
      <div className="inline-row">
        <button
          className="ghost-button"
          type="button"
          onClick={() => onRequestCode('old')}
          disabled={isCodePending}
        >
          获取旧号验证码
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => onRequestCode('new')}
          disabled={isCodePending}
        >
          获取新号验证码
        </button>
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? '修改中...' : '修改手机号'}
        </button>
      </div>
    </form>
  )
}
