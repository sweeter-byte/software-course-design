const friendlyMessages: Record<string, string> = {
  invalid_credentials: '手机号或密码不正确，请重新输入。',
  verification_code_not_found: '请先获取验证码。',
  verification_code_used: '验证码已失效，请重新获取。',
  verification_code_expired: '验证码已过期，请重新获取。',
  verification_code_invalid: '验证码不正确，请重新输入。',
  phone_already_registered: '该手机号已注册，可直接登录。',
  student_id_already_registered: '该学号已存在，请核对后重试。',
  validation_failed: '请检查填写内容后再提交。',
  already_enrolled: '你已加入该课程。',
  forbidden: '当前账号暂无此操作权限。',
  not_found: '未找到对应内容。',
  feedback_requires_grading: '该提交尚未批改，批改后才能发起作业问题或反馈。',
  submission_id_required: '请先选择一条提交记录。',
  internal_server_error: '系统暂时繁忙，请稍后再试。',
}

export function friendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('failed to fetch')) {
    return '当前无法连接系统服务，请确认后端服务已启动。'
  }

  return friendlyMessages[normalized] ?? '当前操作暂时无法完成，请稍后再试。'
}
