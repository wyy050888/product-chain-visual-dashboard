(() => {
  const { $, escape, components } = GoalPrototype;
  let returnFocus;
  function open(row, context) {
    returnFocus = document.activeElement;
    const dialog = $('#linkMonthlyDialog');
    $('#linkMonthlyTitle').textContent = `${row.linkName} · ${context.year}年月度目标`;
    const metrics = ['gsv', 'profit', 'rank', 'clickRate', 'conversionRate', 'feeRate'];
    const records = new Map(row.monthly.map(record => [record.month, record]));
    $('#linkMonthlyBody').innerHTML = context.monthList.map(month => {
      const record = records.get(month);
      return `<tr><td>${context.year}/${String(month).padStart(2, '0')}</td>${metrics.map(field => `<td>${record ? components.renderCell(record, field, 'link', {}, 0) : '<span title="该月未设置链接目标">—</span>'}</td>`).join('')}</tr>`;
    }).join('');
    $('#linkMonthlyIdentity').textContent = `${row.product} · ${row.shop} · ${row.linkId}`;
    dialog.showModal();
  }
  function init() {
    const dialog = $('#linkMonthlyDialog');
    $('#closeLinkMonthly').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => returnFocus?.focus());
  }
  GoalPrototype.linkMonthly = { open, init };
})();
