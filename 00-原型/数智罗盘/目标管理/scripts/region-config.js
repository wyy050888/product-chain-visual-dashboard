// 大区配置表：扩展时新增配置行，不修改表单、导入或统计规则。
(() => {
  const rows = [
    { id: 'REGION001', name: '品牌一区', sort: 1 },
    { id: 'REGION002', name: '品牌二区', sort: 2 },
    { id: 'REGION003', name: '品牌三区', sort: 3 },
    { id: 'REGION004', name: '品牌四区', sort: 4 },
  ];
  const list = () => [...rows].sort((a, b) => a.sort - b.sort);
  const find = name => rows.find(row => row.name === String(name || '').trim());
  const error = '大区名称无效，请填写系统中已有的大区名称；若需新增大区，请联系数智中心';
  function requireRegion(name) {
    const region = find(name);
    if (!region) throw new Error(error);
    return { regionId: region.id, region: region.name };
  }
  // 表单统一使用配置选项；空值用于必填校验，不提供自由创建入口。
  function field(value = '') {
    const esc = GoalPrototype.escape;
    return `<label class="edit-field"><span><b class="req">*</b>大区</span><select name="region" aria-label="大区" aria-describedby="edit-region-error"><option value="">请选择大区</option>${list().map(row => `<option value="${esc(row.name)}" ${row.name === value ? 'selected' : ''}>${esc(row.name)}</option>`).join('')}</select><span class="edit-inline-hint">若有新增大区，请联系数智中心</span><small id="edit-region-error" data-error="region"></small></label>`;
  }
  GoalPrototype.regionConfig = { rows, list, find, requireRegion, error, field };
})();
