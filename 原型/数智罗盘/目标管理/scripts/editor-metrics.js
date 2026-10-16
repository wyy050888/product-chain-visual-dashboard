(() => {
  const app = GoalPrototype, esc = app.escape;
  const definitions = {
    gsv: ['目标GSV', 'w', '0.01', '大于0'],
    profit: ['目标利润率', '%', '0.01', '非零，可为负数'],
    rank: ['目标排名', '名', '1', '正整数'],
    clickRate: ['目标点击率', '%', '0.01', '大于或等于0'],
    conversionRate: ['目标转化率', '%', '0.01', '大于或等于0'],
    feeRate: ['目标费率', '%', '0.01', '大于或等于0']
  };
  function render(key, value = '', suffix = '') {
    const [label, unit, step, hint] = definitions[key], name = key + suffix;
    return `<label class="edit-field"><span><b class="req">*</b>${label}</span>
      <span class="edit-unit-input"><input name="${name}" value="${esc(value)}" type="number" step="${step}" ${key === 'profit' ? '' : `min="${key === 'rank' ? 1 : 0}"`} inputmode="${key === 'rank' ? 'numeric' : 'decimal'}" placeholder="${hint}" aria-label="${label}（${unit}）" aria-describedby="edit-${name}-error"><span aria-hidden="true">${unit}</span></span>
      <small id="edit-${name}-error" data-error="${name}"></small></label>`;
  }
  app.editorMetrics = { render };
})();
