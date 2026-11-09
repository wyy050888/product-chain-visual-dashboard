(() => {
  const app = GoalPrototype, { escape: esc } = app;
  const groups = [
    { key: 'newTag', field: '新品/清仓品', options: ['新品', '清仓品'] },
    { key: 'sharedStock', field: '一盘货', options: ['是', '否'] },
    { key: 'selectedProduct', field: '一类自选品', options: ['自选品', '承流品'] },
  ];
  const instances = new Map();
  let active;
  const summary = values => [values.newTag, values.sharedStock ? `一盘货：${values.sharedStock}` : '', values.selectedProduct].filter(Boolean).join(' / ') || '全部';
  function trigger(id, values = {}) {
    return `<span id="${id}Label">产品类型</span><button type="button" id="${id}Trigger" class="select calendar-trigger product-type-trigger" data-product-type="${id}" aria-labelledby="${id}Label ${id}Text" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}Panel" title="${esc(summary(values))}"><span id="${id}Text">${esc(summary(values))}</span></button>`;
  }
  function close(focus = false) {
    if (!active) return;
    const { panel, button } = active;
    panel.hidden = true; button.setAttribute('aria-expanded', 'false'); active = null;
    if (focus && button.isConnected) button.focus({ preventScroll: true });
  }
  function position() {
    if (!active) return;
    const { panel, button } = active, box = button.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(box.left, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${box.bottom + panel.offsetHeight + 6 < innerHeight ? box.bottom + 6 : Math.max(8, box.top - panel.offsetHeight - 6)}px`;
  }
  function sync(id) {
    const instance = instances.get(id), button = document.getElementById(`${id}Trigger`);
    if (!instance || !button) return;
    const values = instance.get();
    button.querySelector('span').textContent = summary(values); button.title = summary(values);
    instance.panel.querySelectorAll('input').forEach(input => { input.checked = input.value === (values[input.dataset.typeField] || ''); });
    position();
  }
  function open(id, button) {
    if (active?.button === button) { close(true); return; }
    close(); app.entryFilterPanels?.close(); app.periodPicker?.close(); app.overviewPeriod?.close(); app.tooltips?.hide?.();
    const instance = instances.get(id);
    active = { ...instance, button }; instance.panel.hidden = false;
    button.setAttribute('aria-expanded', 'true'); sync(id);
    instance.panel.querySelector('input:checked')?.focus({ preventScroll: true });
  }
  // 两个页面分别提供取值和更新回调，弹层结构、选项及交互保持一致。
  function bind(id, { root, get, change }) {
    const panel = document.createElement('div');
    panel.id = `${id}Panel`; panel.className = 'calendar-panel entry-filter-panel entry-type-panel';
    panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '选择产品类型');
    panel.innerHTML = groups.map(group => `<div class="entry-type-row" role="radiogroup" aria-labelledby="${id}-${group.key}"><span id="${id}-${group.key}">${group.field}</span><div>${['', ...group.options].map(value => `<label><input type="radio" name="${id}-${group.key}" data-type-field="${group.key}" value="${esc(value)}"><span>${value || '全部'}</span></label>`).join('')}</div></div>`).join('');
    document.body.append(panel); instances.set(id, { panel, get });
    root.addEventListener('click', event => { const button = event.target.closest(`[data-product-type="${id}"]`); if (button) open(id, button); });
    root.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target.matches(`[data-product-type="${id}"]`)) { event.preventDefault(); open(id, event.target); }
    });
    panel.addEventListener('change', event => { const field = event.target.dataset.typeField; if (field) { change(field, event.target.value); sync(id); } });
  }
  document.addEventListener('keydown', event => { if (active && event.key === 'Escape') { event.preventDefault(); close(true); } });
  document.addEventListener('pointerdown', event => { if (active && !active.panel.contains(event.target) && !active.button.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (active && !active.panel.contains(event.target) && event.target !== active.button) close(); });
  document.addEventListener('scroll', event => { if (active && !active.panel.contains(event.target)) close(); }, true);
  window.addEventListener('resize', () => close());
  app.productTypeFilter = { groups, trigger, bind, sync, close };
})();
