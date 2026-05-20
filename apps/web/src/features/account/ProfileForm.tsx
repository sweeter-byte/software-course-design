/**
 * Read-only summary of the personal-info fields entered at registration.
 * Per §0.4, the account-maintenance page only exposes phone + password edits;
 * everything else is just for review. The legacy ProfileFormState type is kept
 * so the parent <AccountSection /> contract doesn't churn.
 */
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
}

export function ProfileForm({ values }: ProfileFormProps) {
  const items: Array<{ label: string; value: string }> = [
    { label: '用户名', value: values.username },
    { label: '真实姓名', value: values.realName },
    { label: '邮箱', value: values.email },
    { label: '性别', value: values.gender },
    { label: '学院', value: values.college },
    { label: '专业', value: values.major },
    { label: '班级', value: values.className },
  ]

  return (
    <section className="profile-summary" aria-label="个人资料">
      <header>
        <h4>个人资料</h4>
        <p className="muted-paragraph">
          个人资料仅供查看，如需修改请联系教务员。可通过下方表单修改手机号或密码。
        </p>
      </header>
      <dl className="detail-list">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
