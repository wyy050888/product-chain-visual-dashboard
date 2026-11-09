(() => {
  const app = GoalPrototype;
  function validate(kind, matrix, cid, source = null) {
    const fields = app.entrySchema.fields(kind), headers = app.entrySchema.headers(kind);
    const actual = (matrix[0] || []).map(value => String(value ?? '').replace(/^\uFEFF/, '').trim());
    if (headers.some((name, index) => actual[index] !== name) || actual.slice(headers.length).some(name => name && name !== '错误原因')) throw new Error('表头与当前目标类型不一致，请使用最新模板');
    const rows = matrix.slice(1).map((cells, index) => ({ cells, line: source?.rows[index]?.line ?? index + 2, invalidMonth:source?.rows[index]?.invalidMonth })).filter(row => row.cells.slice(0, fields.length).some(value => String(value ?? '').trim()));
    if (!rows.length) throw new Error('文件中没有目标记录');
    const groups = new Map();
    rows.forEach(row => {
      const input = { cid };
      fields.forEach(([key], index) => { input[key] = row.cells[index] ?? ''; });
      const result = app.entrySchema.normalize(kind, input, { validateBrand: true, importMode: true });
      if (source?.combined && (row.invalidMonth || result.errors.year || result.errors.monthNumber)) {
        delete result.errors.year;
        result.errors.monthNumber = String(row.cells[1] ?? '').trim() ? '月份格式须为YYYY/MM，年份1900—9999、月份01—12，例如2026/09' : '月份不能为空';
        if (String(row.cells[1]) === '不支持公式，请粘贴为数值') result.errors.monthNumber = '不支持公式，请粘贴为数值后重新上传';
      }
      row.record = result.record; row.fieldErrors = result.errors; row.errors = Object.values(result.errors);
      row.issues = fields.filter(([key]) => result.errors[key]).map(([key, label]) => ({ line: row.line, field: label, value: input[key], reason: result.errors[key] }));
      if (['year', 'monthNumber', 'channel', 'shop', 'product', 'productCode', ...(kind === 'link' ? ['linkId'] : [])].some(key => result.errors[key])) return;
      const key = kind === 'link' ? app.targetStore.linkKey(row.record) : app.targetStore.key(row.record);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    groups.forEach(group => { if (group.length > 1) group.forEach(row => {
      const reason = `文件内重复目标（第${group.map(item => item.line).join('、')}行）`;
      row.errors.push(reason); row.issues.push({ line: row.line, field: '目标明细', value: row.record.productCode, reason });
    }); });
    const targetGroups = new Map();
    rows.forEach(row => {
      if (['year', 'monthNumber', 'channel', 'shop', 'product', 'productCode'].some(field => row.fieldErrors[field])) return;
      const key = app.targetGroup.key(row.record);
      if (!targetGroups.has(key)) targetGroups.set(key, []);
      targetGroups.get(key).push(row);
    });
    targetGroups.forEach(group => app.targetGroup.fields.forEach(field => {
      const valid = group.filter(row => !row.fieldErrors[field]);
      if (new Set(valid.map(row => app.targetGroup.value(row.record, field))).size < 2) return;
      const reason = app.targetGroup.error(field, valid.map(row => row.line));
      valid.forEach(row => {
        row.errors.push(reason);
        row.issues.push({ line: row.line, field: app.targetGroup.labels[field], value: row.record[field], reason });
      });
    }));
    const order = fields.map(([, label]) => label);
    rows.forEach(row => row.issues.sort((a, b) => (order.includes(a.field) ? order.indexOf(a.field) : order.length) - (order.includes(b.field) ? order.indexOf(b.field) : order.length)));
    return { rows, errors: rows.filter(row => row.errors.length), source };
  }
  // 使用单元格格式识别 Excel 百分比；链接 ID 始终作为字符串传递。
  function matrix(sheet) {
    if (!sheet['!ref']) return [];
    const result = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: true, range:{s:{r:0,c:0},e:XLSX.utils.decode_range(sheet['!ref']).e} });
    result.forEach((row, r) => row.forEach((value, c) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.f) row[c] = '不支持公式，请粘贴为数值';
      else if (typeof value === 'number' && cell?.z && /y/i.test(cell.z) && /m/i.test(cell.z)) row[c] = XLSX.SSF.format('yyyy/mm',value);
      else if (typeof value === 'number' && cell?.z?.includes('%')) row[c] = Number((value * 100).toFixed(10));
    }));
    return result;
  }
  app.entryImportData = { validate, matrix };
})();
