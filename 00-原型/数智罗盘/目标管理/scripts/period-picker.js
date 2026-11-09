(() => {
  const app = GoalPrototype;
  let panel, active, pageYear;
  function close(focus = false) {
    if (!active) return;
    const button = active.button;
    button.setAttribute('aria-expanded', 'false'); panel.hidden = true; active = null;
    if (focus) button.focus();
  }
  function position() {
    if (!active) return;
    const box = active.button.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
    panel.style.left = `${Math.max(8, Math.min(box.right - width, innerWidth - width - 8))}px`;
    panel.style.top = `${box.bottom + height + 6 < innerHeight ? box.bottom + 6 : Math.max(8, box.top - height - 6)}px`;
  }
  function render(focus = true) {
    const kind = active.kind(), currentYear = Number(active.year.value), value = Number(active.select.value);
    panel.dataset.kind = kind;
    panel.setAttribute('aria-label', kind === 'year' ? '选择年份' : kind === 'quarter' ? '选择季度' : '选择月份');
    panel.innerHTML = app.calendarGrid.render({kind,year:pageYear,selectedYear:currentYear,values:[value],allowed:active.allowed,allowAll:active.allowAll});
    position();
    if (focus) (panel.querySelector('.selected') || panel.querySelector('[data-calendar-value]:not(:disabled)')).focus({ preventScroll: true });
  }
  function open(binding) {
    if (active === binding) { close(true); return; }
    if (binding.button.disabled) return;
    close(); app.overviewPeriod.close(); app.entryFilterPanels?.close(); app.editorCombobox?.close(); app.tooltips?.hide?.();
    (binding.button.closest('dialog') || document.body).append(panel);
    active = binding; pageYear = Number(binding.year.value); panel.hidden = false;
    binding.button.setAttribute('aria-expanded', 'true'); render();
  }
  function setValue(select, value) {
    if (![...select.options].some(option => option.value === String(value))) select.add(new Option(String(value), String(value)));
    select.value = String(value); select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function bind(id, yearId, kind) {
    const select = document.getElementById(id), year = document.getElementById(yearId);
    const button = document.createElement('button'); button.type = 'button'; button.id = id + 'Trigger';
    button.className = 'stat-picker calendar-trigger'; button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', panel.id);
    select.hidden = true; select.after(button);
    const binding = { select, year, kind, button };
    const sync = () => {
      button.hidden = select.classList.contains('hidden'); button.disabled = select.disabled;
      button.setAttribute('aria-label', select.getAttribute('aria-label'));
      button.textContent = select.selectedOptions[0]?.textContent || '';
      if (active === binding && button.hidden) close();
    };
    new MutationObserver(sync).observe(select, { attributes: true, childList: true, subtree: true });
    select.addEventListener('change', sync); button.addEventListener('click', () => open(binding));
    button.addEventListener('keydown', event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(binding); } });
    sync();
  }
  function init() {
    panel = document.createElement('div'); panel.id = 'periodPicker'; panel.className = 'calendar-panel';
    panel.hidden = true; panel.setAttribute('role', 'dialog'); document.body.append(panel);
    bind('statYear', 'statYear', () => 'year'); bind('entryYear', 'entryYear', () => 'year');
    bind('statSinglePeriod', 'statYear', () => app.overviewPeriod.selection().period);
    panel.addEventListener('click', event => {
      const nav = event.target.closest('[data-calendar-nav]');
      if (nav) {
        const direction = nav.dataset.calendarNav;
        pageYear += Number(direction) * (active.kind() === 'year' ? 10 : 1);
        pageYear = Math.min(9999, Math.max(1900, pageYear)); render(false);
        const next = panel.querySelector(`[data-calendar-nav="${direction}"]`);
        (next.disabled ? panel.querySelector('[data-calendar-value]') : next).focus({ preventScroll: true });
        return;
      }
      const all = event.target.closest('[data-calendar-preset="all"]');
      if (all && active.allowAll) { const binding=active; close(); binding.commit(Number(binding.year.value), ''); binding.button.focus(); return; }
      const choice = event.target.closest('[data-calendar-value]'); if (!choice || choice.disabled) return;
      const binding = active, year = pageYear, kind = binding.kind(), value = Number(choice.dataset.calendarValue);
      close();
      if (binding.commit) binding.commit(year,value);
      else {
        if (kind !== 'year' && Number(binding.year.value) !== year) setValue(binding.year, year);
        setValue(binding.select, value);
      }
      binding.button.focus();
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
      app.calendarGrid.keyboard(event,panel);
    });
    document.addEventListener('pointerdown', event => { if (active && !panel.contains(event.target) && !active.button.contains(event.target)) close(); });
    document.addEventListener('focusin', event => { if (active && !panel.contains(event.target) && event.target !== active.button) close(); });
    window.addEventListener('resize', () => close());
    document.addEventListener('scroll', event => { if (active && !panel.contains(event.target)) close(); }, true);
  }
  function openMonth(button, {year,month,commit,allowed=null,allowAll=false}) {
    if (active?.button === button) { close(true); return; }
    open({button,year:{value:year},select:{value:month},kind:()=> 'month',commit,allowed,allowAll});
  }
  app.periodPicker = { init, close, openMonth };
})();
