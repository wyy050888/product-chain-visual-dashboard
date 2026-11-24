// 通过部门看板的共用角色处理器给检查设置角色上下文。
export function setProductCenterRole(page, role) {
 return page.evaluate(value => {
  const roleInput = document.createElement('select');
  roleInput.id = 'dp-role';
  roleInput.hidden = true;
  roleInput.add(new Option(value, value, true, true));
  document.body.append(roleInput);
  try {
   roleInput.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
   roleInput.remove();
  }
 }, role);
}
