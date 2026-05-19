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
        <label htmlFor="profile-username">
          用户名
          <input
            id="profile-username"
            name="username"
            autoComplete="nickname"
            minLength={2}
            title="用户名至少 2 位"
            value={values.username}
            onChange={(event) => onChange({ ...values, username: event.target.value })}
          />
        </label>
        <label htmlFor="profile-real-name">
          真实姓名
          <input
            id="profile-real-name"
            name="realName"
            autoComplete="name"
            minLength={2}
            title="真实姓名至少 2 位"
            value={values.realName}
            onChange={(event) => onChange({ ...values, realName: event.target.value })}
          />
        </label>
        <label htmlFor="profile-email">
          邮箱
          <input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            title="请输入正确的邮箱地址"
            value={values.email}
            onChange={(event) => onChange({ ...values, email: event.target.value })}
          />
        </label>
        <label htmlFor="profile-gender">
          性别
          <input
            id="profile-gender"
            name="gender"
            autoComplete="sex"
            value={values.gender}
            onChange={(event) => onChange({ ...values, gender: event.target.value })}
          />
        </label>
        <label htmlFor="profile-college">
          学院
          <input
            id="profile-college"
            name="college"
            autoComplete="organization"
            value={values.college}
            onChange={(event) => onChange({ ...values, college: event.target.value })}
          />
        </label>
        <label htmlFor="profile-major">
          专业
          <input
            id="profile-major"
            name="major"
            autoComplete="off"
            value={values.major}
            onChange={(event) => onChange({ ...values, major: event.target.value })}
          />
        </label>
        <label htmlFor="profile-class-name">
          班级
          <input
            id="profile-class-name"
            name="className"
            autoComplete="off"
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
