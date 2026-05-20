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
      aria-label="个人资料"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header>
        <h4>个人资料</h4>
      </header>
      <div className="form-grid">
        <label htmlFor="profile-username">
          用户名
          <input
            id="profile-username"
            name="username"
            autoComplete="nickname"
            required
            minLength={2}
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
            required
            minLength={2}
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
            value={values.email}
            onChange={(event) => onChange({ ...values, email: event.target.value })}
          />
        </label>
        <label htmlFor="profile-gender">
          性别
          <select
            id="profile-gender"
            name="gender"
            value={values.gender}
            onChange={(event) => onChange({ ...values, gender: event.target.value })}
          >
            <option value="">请选择</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
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
