(() => {
  const app = GoalPrototype, { $ } = app;
  let controls, active, calendar;
  function close(focus = false) {
    app.productTypeFilter.close(focus);
    if (!active) return;
    const { panel, trigger } = active;
    panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); active = null;
    if (focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }
  function position() {
    if (!active) return;
    const { panel, trigger } = active, box = trigger.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(box.left, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${box.bottom + panel.offsetHeight + 6 < innerHeight ? box.bottom + 6 : Math.max(8, box.top - panel.offsetHeight - 6)}px`;
  }
  function sync() {
    if (!controls) return;
    const { year, months } = controls.get();
    const monthTrigger = $('#entryMonthTrigger');
    const monthText = months.length === 12 ? '全部月份' : months.length > 2 ? `已选${months.length}个月` : months.map(value => value + '月').join('、');
    monthTrigger.innerHTML = `<span>${monthText}</span>`;
    monthTrigger.title = months.map(value => `${year}/${String(value).padStart(2, '0')}`).join('、');
    calendar?.sync();
    app.productTypeFilter.sync("entryProductType");
    position();
  }
  function open(trigger, panel) {
    if (active?.trigger === trigger) { close(true); return; }
    close(); app.periodPicker?.close(); app.overviewPeriod.close(); app.tooltips?.hide?.();
    active = { trigger, panel }; panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true'); sync();
    (panel.querySelector('input:checked:not(:disabled)') || panel.querySelector('button, input:not(:disabled)'))?.focus({ preventScroll: true });
  }
  function makePanel(id, label, html, className) {
    const panel = document.createElement('div'); panel.id = id; panel.className = `calendar-panel entry-filter-panel ${className}`;
    panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label); panel.innerHTML = html;
    document.body.append(panel); return panel;
  }
  function init(callbacks) {
    controls = callbacks;
    const monthPanel = makePanel('entryMonthPanel', '选择填报月份', '', 'entry-multi-month');
    calendar = app.calendarGrid.bindMulti(monthPanel, { get: () => ({kind:'month',year:controls.get().year,values:controls.get().months}), change: value => controls.change({year:value.year,months:value.values}), preset:'data-month-preset' });
    app.productTypeFilter.bind('entryProductType', { root: $('#efilters'), get: () => controls.get().filters, change: (field, value) => controls.change({ filters: { [field]: value } }) });
    $('#efilters').addEventListener('click', event => {
      const trigger = event.target.closest('#entryMonthTrigger');
      if (trigger) open(trigger, monthPanel);
    });
    $('#efilters').addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target.matches('#entryMonthTrigger')) {
        event.preventDefault(); open(event.target, monthPanel);
      }
    });
    document.addEventListener('keydown', event => { if (active && event.key === 'Escape') { event.preventDefault(); close(true); } });
    document.addEventListener('pointerdown', event => { if (active && !active.panel.contains(event.target) && !active.trigger.contains(event.target)) close(); });
    document.addEventListener('focusin', event => { if (active && !active.panel.contains(event.target) && event.target !== active.trigger) close(); });
    document.addEventListener('scroll', event => { if (active && !active.panel.contains(event.target)) close(); }, true);
    window.addEventListener('resize', () => close());
  }
  app.entryFilterPanels = { init, sync, close };
})();
