(() => {
  const app = GoalPrototype, esc = app.escape;
  const icons = { 天猫: 'tmall.png', 京东: 'jd.ico', 拼多多: 'pinduoduo.png' };
  let bindings = [], active, panel, controller, items = [], cursor = -1, source;
  function options(binding) {
    const { control, input } = binding;
    if (control.tagName === 'SELECT') return [...control.options].filter(option => option.value).map(option => ({ value: option.value, label: option.textContent }));
    return source(control.name);
  }
  function value(control) {
    const binding = bindings.find(item => item.control === control);
    if (!binding) return control.name==='targetMonth'?app.monthField.value(control.value):control.value;
    if (binding.picked && binding.input.value === binding.picked.label) return binding.picked.value;
    return control.value;
  }
  function close() {
    if (active) {
      active.input.setAttribute('aria-expanded', 'false');
      active.input.removeAttribute('aria-activedescendant');
    }
    active = null;
    if (panel) panel.hidden = true;
  }
  function position() {
    const box = active.wrapper.getBoundingClientRect(), drawer = document.querySelector('#drawer').getBoundingClientRect();
    panel.style.width = `${box.width}px`;
    const below = drawer.bottom - box.bottom - 12, above = box.top - drawer.top - 12;
    const up = below < Math.min(panel.scrollHeight, 240) && above > below;
    const height = Math.min(280, Math.max(60, up ? above : below));
    panel.style.maxHeight = `${height}px`;
    panel.style.left = `${box.left}px`;
    panel.style.top = `${up ? box.top - Math.min(panel.scrollHeight, height) - 4 : box.bottom + 4}px`;
  }
  function highlight(index) {
    cursor = index;
    panel.querySelectorAll('[role="option"]').forEach((option, i) => {
      option.classList.toggle('active', i === cursor);
      option.setAttribute('aria-selected', String(i === cursor));
    });
    const option = panel.querySelector(`[data-choice="${cursor}"]`);
    if (option) {
      active.input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    } else active.input.removeAttribute('aria-activedescendant');
  }
  function render(query = '') {
    const term = query.trim().toLocaleLowerCase().replaceAll('-', '/');
    if (active.searchOnly && !term) { close(); return; }
    items = options(active).filter(item => [item.label, item.value, item.code, item.channel].some(text => String(text || '').toLocaleLowerCase().replaceAll('-', '/').includes(term)));
    panel.innerHTML = items.length ? items.map((item, index) => `${item.group && item.group !== items[index - 1]?.group ? `<div class="editor-combo-group">${esc(item.group)}</div>` : ''}<div role="option" id="editor-option-${index}" data-choice="${index}" aria-selected="false" class="editor-combo-option">
      ${item.channel && icons[item.channel] ? `<img src="assets/channels/${icons[item.channel]}" alt="${esc(item.channel)}" title="${esc(item.channel)}" class="channel-icon">` : ''}
      <span class="editor-option-copy"><span class="editor-option-name">${esc(item.label)}</span>${item.code ? `<small>${esc(item.code)}</small>` : ''}</span>
    </div>`).join('') : '<div class="editor-combo-empty" role="status">暂无匹配项</div>';
    position(); highlight(-1);
  }
  function open(binding, query = binding.searchOnly && !binding.picked ? binding.input.value : '') {
    if (binding.input.readOnly || binding.input.disabled || (binding.searchOnly && !query.trim())) { close(); return; }
    if (active !== binding) close();
    active = binding; panel.hidden = false;
    binding.input.setAttribute('aria-expanded', 'true');
    render(query);
  }
  function choose(item) {
    const binding = active;
    binding.picked = item;
    binding.control.value = item.value;
    binding.input.value = item.label;
    close();
    binding.control.dispatchEvent(new Event('change', { bubbles: true }));
    binding.input.focus({ preventScroll: true });
  }
  function sync(binding) {
    if (binding.control.tagName === 'SELECT') {
      const selected = options(binding).find(item => item.value === binding.control.value);
      binding.picked = selected;
      binding.input.value = selected?.label || '';
    } else if (!binding.picked) {
      const selected = options(binding).find(item => item.value === binding.control.value);
      if (selected) { binding.picked = selected; binding.input.value = selected.label; }
    }
    binding.input.setAttribute('aria-invalid', binding.control.getAttribute('aria-invalid') || 'false');
  }
  function refresh() {
    bindings.forEach(binding => {
      if (binding !== active) sync(binding);
      if (binding.picked && binding.input.value !== binding.picked.label) binding.picked = null;
    });
    if (active) render(active.input.value === active.picked?.label ? '' : active.input.value);
  }
  function detach() {
    app.monthField.detach();
    close(); controller?.abort();
    bindings.forEach(binding => {
      const canonical = value(binding.control);
      binding.wrapper.replaceWith(binding.control);
      binding.control.hidden = false;
      if (binding.list) binding.control.setAttribute('list', binding.list);
      binding.control.value = canonical;
    });
    bindings = [];
  }
  function attach(root, getOptions) {
    detach(); controller = new AbortController();
    source = getOptions; bindings = [];
    const on = (node, event, fn) => node.addEventListener(event, fn, { signal: controller.signal });
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'editorComboboxList';
      panel.className = 'editor-combo-list'; panel.hidden = true; panel.setAttribute('role', 'listbox');
      document.querySelector('#drawer').append(panel);
    }
    root.querySelectorAll('select, input[list], input[type="month"]').forEach(control => {
      if (control.type === 'month') { app.monthField.attach(control, controller.signal); return; }
      const isSelect = control.tagName === 'SELECT';
      const wrapper = document.createElement('span'); wrapper.className = 'editor-combo';
      control.before(wrapper); wrapper.append(control);
      const input = isSelect ? document.createElement('input') : control;
      if (isSelect) { control.hidden = true; input.disabled = control.disabled; wrapper.append(input); }
      const list = input.getAttribute('list');
      input.removeAttribute('list'); input.autocomplete = 'off'; input.spellcheck = false;
      input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', panel.id);
      input.dataset.combo = control.name;
      input.setAttribute('aria-label', control.getAttribute('aria-label') || control.closest('label')?.querySelector('span')?.textContent.replace('*', '') || control.name);
      if (isSelect) input.placeholder = '请选择或搜索';
      if (control.getAttribute('aria-describedby')) input.setAttribute('aria-describedby', control.getAttribute('aria-describedby'));
      const searchOnly = /^(product|strategy|promotion)(_|$)/.test(control.name);
      if (isSelect && searchOnly) input.placeholder = '请输入姓名搜索';
      if (!searchOnly) {
        const arrow = document.createElement('span'); arrow.className = 'editor-combo-arrow'; arrow.textContent = '⌄'; arrow.setAttribute('aria-hidden', 'true'); wrapper.append(arrow);
      }
      const binding = { control, input, wrapper, list, searchOnly, picked: null }; bindings.push(binding); sync(binding);
      on(input, 'focus', () => { input.select(); open(binding); });
      on(input, 'click', () => { if (active !== binding) open(binding); });
      on(input, 'input', event => {
        binding.picked = null;
        if (isSelect) {
          control.value = '';
          control.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (!event.isComposing) open(binding, input.value);
      });
      on(input, 'compositionend', () => open(binding, input.value));
      on(input, 'compositionstart', () => { if (searchOnly) close(); });
      on(input, 'blur', () => {
        const query = input.value.trim();
        // 历史人员仅回显姓名，未主动改选时保留原ID供有效性校验。
        if (binding.picked?.fallback && query === binding.picked.label) { close(); return; }
        const exact = options(binding).filter(item => item.value === query || item.label === query);
        if (exact.length === 1) {
          const changed = binding.picked?.value !== exact[0].value;
          binding.picked = exact[0]; control.value = exact[0].value; input.value = exact[0].label;
          if (changed) control.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (isSelect) sync(binding);
        close();
      });
      on(input, 'keydown', event => {
        if (event.isComposing || input.readOnly || input.disabled) return;
        if (event.key === 'Escape' && active === binding) { event.preventDefault(); event.stopPropagation(); close(); }
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          if (active !== binding) open(binding);
          if (active !== binding) return;
          highlight(Math.max(0, Math.min(items.length - 1, cursor + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        if (event.key === 'Enter' && active === binding) {
          event.preventDefault();
          if (items.length) choose(items[cursor < 0 ? 0 : cursor]);
        }
      });
      if (isSelect) on(control, 'change', () => { if (document.activeElement !== input) sync(binding); });
    });
    on(panel, 'pointerdown', event => event.preventDefault());
    on(panel, 'click', event => {
      const option = event.target.closest('[data-choice]');
      if (option) choose(items[Number(option.dataset.choice)]);
    });
    on(document, 'pointerdown', event => { if (active && !active.wrapper.contains(event.target) && !panel.contains(event.target)) close(); });
    document.addEventListener('scroll', event => { if (active && !panel.contains(event.target)) close(); }, { capture: true, signal: controller.signal });
    on(window, 'resize', close);
  }
  function setValue(control, next, fallbackLabel) {
    const binding = bindings.find(item => item.control === control);
    control.value = next;
    if (binding) {
      binding.picked = options(binding).find(item => item.value === next);
      if (!binding.picked && next && fallbackLabel !== undefined) binding.picked = { value: next, label: fallbackLabel, fallback: true };
      binding.input.value = binding.picked?.label ?? next;
    }
  }
  app.editorCombobox = { attach, detach, refresh, value, close, setValue };
})();
