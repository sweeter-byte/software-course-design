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
        <label>
          旧手机号
          <input
            value={values.oldPhone}
            onChange={(event) => onChange({ ...values, oldPhone: event.target.value })}
          />
        </label>
        <label>
          旧手机号验证码
          <input
            value={values.oldVerificationCode}
            onChange={(event) =>
              onChange({ ...values, oldVerificationCode: event.target.value })
            }
          />
        </label>
        <label>
          新手机号
          <input
            value={values.newPhone}
            onChange={(event) => onChange({ ...values, newPhone: event.target.value })}
          />
        </label>
        <label>
          新手机号验证码
          <input
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
