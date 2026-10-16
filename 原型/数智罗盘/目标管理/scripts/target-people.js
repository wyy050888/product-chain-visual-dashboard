// 产品、链接共用人员选择，按人员ID保存；同组回显由 editor-group 统一处理。
(() => {
  const app = GoalPrototype, esc = app.escape;
  const options = () => app.entrySchema.catalog().people.filter(person => person.active !== false).map(person => ({ value: person.id, label: person.name }));
  function field(role, value = '', savedName = '') {
    const label = role === 'strategy' ? '店长策略' : '店长推广';
    const name = options().find(person => person.value === value || person.label === value)?.label || savedName;
    return `<label class="edit-field"><span><b class="req">*</b>${label}</span><input name="${role}" value="${esc(name || '')}" list="targetPeopleOptions" autocomplete="off" placeholder="请输入姓名搜索" aria-describedby="edit-${role}-error"><small id="edit-${role}-error" data-error="${role}"></small></label>`;
  }
  app.targetPeople = { options, field };
})();
