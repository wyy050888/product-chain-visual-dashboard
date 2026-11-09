(() => {
  const { $, $$, state } = GoalPrototype;
  const all = length => Array.from({ length }, (_, index) => index + 1);
  const current = () => GoalPrototype.clock.parts().month;
  let calendar;
  const memory = {
    matrix: { period: 'month', year: GoalPrototype.clock.parts().year, months: all(12), quarters: all(4) },
    link: { period: 'month', year: GoalPrototype.clock.parts().year, months: [current()], quarters: [Math.ceil(current() / 3)] },
  };
  const isLink = () => state.level === 'channel' && state.shopTab === 'link';
  const selection = () => memory[isLink() ? 'link' : 'matrix'];
  const quarterMonths = q => [q * 3 - 2, q * 3 - 1, q * 3];
  const key = () => selection().period === 'quarter' ? 'quarters' : 'months';
  function buckets() {
    const selected = selection();
    if (selected.period === 'year') return [{ id: 'year', label: `${selected.year}年`, months: all(12) }];
    return [...selected[key()]].sort((a, b) => a - b).map(value => ({
      id: String(value), label: `${selected.year}/${selected.period === 'quarter' ? 'Q' + value : String(value).padStart(2, '0')}`,
      months: selected.period === 'quarter' ? quarterMonths(value) : [value],
    }));
  }
  const monthList = () => buckets().flatMap(bucket => bucket.months);
  const factor = () => monthList().length;
  const label = () => buckets().map(bucket => bucket.label).join('、');
  const context = () => ({ path: state.path, cid: state.cid, year: selection().year, monthList: monthList(), periodGroups: buckets().map(bucket => bucket.months) });
  function close() {
    $('#statMonthBox').classList.remove('open');
    $('#statMonthTrigger').setAttribute('aria-expanded', 'false');
  }
  function sync() {
    const selected = selection();
    state.period = selected.period;
    state.months = new Set(monthList().map(String));
    $$('.stat-segments button').forEach(button => {
      button.classList.toggle('on', button.dataset.period === selected.period);
      button.setAttribute('aria-pressed', String(button.dataset.period === selected.period));
    });
    if (GoalPrototype.targetStore) $('#statYear').innerHTML = [...new Set([...GoalPrototype.targetStore.years(), ...(['whole', 'dabo'].includes(state.level) ? GoalPrototype.daboData.years() : []), selected.year])].sort((a, b) => a - b).map(year => `<option>${year}</option>`).join('');
    $('#statYear').value = String(selected.year);
    $('#statMonthBox').classList.toggle('hidden', selected.period === 'year' || isLink());
    $('#statSinglePeriod').classList.toggle('hidden', selected.period === 'year' || !isLink());
    const count = selected.period === 'quarter' ? 4 : 12;
    const unit = selected.period === 'quarter' ? '季度' : '月份';
    const name = value => selected.period === 'quarter' ? 'Q' + value : value + '月';
    const values = selected[key()];
    $('#statMonthTrigger').textContent = values.length === count ? '全部' + unit + ' ⌄' : values.length > 3 ? `已选${values.length}个${unit} ⌄` : values.map(name).join('、') + ' ⌄';
    $('#statMonthTrigger').title = label();
    const quarter = selected.period === 'quarter';
    $('#statMonthPanel').classList.add('multi-calendar');
    $('#statMonthPanel').classList.toggle('quarter-calendar', quarter);
    calendar?.sync();
    $('#statSinglePeriod').innerHTML = all(count).map(value => `<option value="${value}" ${values.includes(value) ? 'selected' : ''}>${name(value)}</option>`).join('');
    $('#statSinglePeriod').setAttribute('aria-label', '选择' + unit);
  }
  function reset() {
    const selected = selection();
    selected.months = isLink() ? [current()] : all(12);
    selected.quarters = isLink() ? [Math.ceil(current() / 3)] : all(4);
    close(); sync();
  }
  function init(onChange) {
    $$('.stat-segments button').forEach(button => button.addEventListener('click', () => {
      selection().period = button.dataset.period; close(); sync(); onChange();
    }));
    $('#statYear').addEventListener('change', event => { memory.matrix.year = memory.link.year = Number(event.target.value); sync(); onChange(); });
    $('#statSinglePeriod').addEventListener('change', event => { selection()[key()] = [Number(event.target.value)]; sync(); onChange(); });
    $('#statMonthTrigger').addEventListener('click', () => {
      GoalPrototype.periodPicker?.close();
      $('#statMonthTrigger').setAttribute('aria-expanded', String($('#statMonthBox').classList.toggle('open')));
    });
    calendar = GoalPrototype.calendarGrid.bindMulti($('#statMonthPanel'), {
      get: () => ({ kind: selection().period, year: selection().year, values: [...selection()[key()]] }),
      change: value => { memory.matrix.year = memory.link.year = value.year; selection()[key()] = value.values; sync(); onChange(); },
      nav: 'data-period-year', preset: 'data-period-preset',
    });
    $('#statMonthTrigger').addEventListener('keydown', event => {
      if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); if (!$('#statMonthBox').classList.contains('open')) $('#statMonthTrigger').click(); $('#statMonthPanel input:not(:disabled)')?.focus(); }
    });
    document.addEventListener('click', event => { if (!event.composedPath().includes($('#statMonthBox'))) close(); });
    $('#statMonthBox').addEventListener('keydown', event => { if (event.key === 'Escape') { close(); $('#statMonthTrigger').focus(); } });
    sync();
  }
  GoalPrototype.overviewPeriod = { init, sync, close, reset, buckets, monthList, factor, label, context, selection, isLink };
})();
