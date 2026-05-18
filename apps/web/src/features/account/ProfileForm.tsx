export type ProfileFormState = {
  username: string
  realName: string
  email: string
  gender: string
  college: string
  major: string
  className: string
}

type ProfileFormProps = {
  values: ProfileFormState
  isPending: boolean
  onChange: (next: ProfileFormState) => void
  onSubmit: () => void
}

export function ProfileForm({ values, isPending, onChange, onSubmit }: ProfileFormProps) {
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
          邮箱
          <input
            value={values.email}
            onChange={(event) => onChange({ ...values, email: event.target.value })}
          />
        </label>
        <label>
          性别
          <input
            value={values.gender}
            onChange={(event) => onChange({ ...values, gender: event.target.value })}
          />
        </label>
        <label>
          学院
          <input
            value={values.college}
            onChange={(event) => onChange({ ...values, college: event.target.value })}
          />
        </label>
        <label>
          专业
          <input
            value={values.major}
            onChange={(event) => onChange({ ...values, major: event.target.value })}
          />
        </label>
        <label>
          班级
          <input
            value={values.className}
            onChange={(event) => onChange({ ...values, className: event.target.value })}
          />
        </label>
      </div>
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? '保存中...' : '保存资料'}
      </button>
    </form>
  )
}
