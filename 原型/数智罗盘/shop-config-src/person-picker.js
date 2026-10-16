// Configuration selection requires a directory match; search filters remain plain text inputs.
function createPersonPicker(root) {
  const sources = new WeakMap();
  const popup = document.createElement('div');
  popup.id = 'person-options'; popup.className = 'person-options';
  popup.setAttribute('role','listbox'); popup.hidden = true; root.append(popup);
  let active = null, matches = [], index = -1;
  function close() {
    active?.setAttribute('aria-expanded','false');
    active?.removeAttribute('aria-activedescendant');
    popup.hidden = true; active = null; index = -1;
  }
  function highlight() {
    [...popup.querySelectorAll('[role="option"]')].forEach((option,i) => option.setAttribute('aria-selected',String(i === index)));
    if (index < 0) active?.removeAttribute('aria-activedescendant');
    else {
      active.setAttribute('aria-activedescendant',`person-option-${index}`);
      popup.children[index].scrollIntoView({block:'nearest'});
    }
  }
  function search(input) {
    close();
    const query = input.value.trim().toLowerCase();
    if (!query || input.disabled) return;
    active = input; matches = sources.get(input).filter(name => name.toLowerCase().includes(query));
    (input.closest('[role="dialog"]') || root).append(popup);
    popup.innerHTML = matches.length ? matches.map((name,i) => `<div role="option" aria-selected="false" id="person-option-${i}" data-index="${i}">${View.escape(name)}</div>`).join('') : '<div class="person-empty" role="status">暂无匹配人员</div>';
    popup.hidden = false; input.setAttribute('aria-expanded','true');
    const rect = input.getBoundingClientRect();
    popup.style.width = `${rect.width}px`; popup.style.left = `${rect.left}px`;
    const height = Math.min(popup.scrollHeight,200);
    popup.style.top = `${rect.bottom + height + 6 > innerHeight ? Math.max(8,rect.top-height-6) : rect.bottom+6}px`;
  }
  function select(i) {
    if (!active || !matches[i]) return;
    const input = active; input.value = matches[i]; input.dataset.selected = matches[i];
    close(); input.dispatchEvent(new Event('change',{bubbles:true})); input.focus();
  }
  popup.addEventListener('pointerdown',event => event.preventDefault());
  popup.addEventListener('click',event => {
    const option = event.target.closest('[data-index]'); if (option) select(+option.dataset.index);
  });
  root.addEventListener('pointerdown',event => { if (event.target !== active && !popup.contains(event.target)) close(); });
  root.addEventListener('scroll',event => { if (!popup.contains(event.target)) close(); },true);
  window.addEventListener('resize',close);
  function set(input, options, value = '') {
    close();
    if (!sources.has(input)) {
      const wrapper = document.createElement('span'); wrapper.className = 'person-picker';
      input.before(wrapper); wrapper.append(input);
      const arrow = document.createElement('span'); arrow.className = 'person-arrow'; arrow.textContent = '⌄'; arrow.setAttribute('aria-hidden','true'); wrapper.append(arrow);
      input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list');
      input.setAttribute('aria-controls',popup.id); input.setAttribute('aria-expanded','false'); input.autocomplete = 'off';
      input.addEventListener('input',event => { input.dataset.selected = ''; if (!event.isComposing) search(input); });
      input.addEventListener('compositionend',() => search(input));
      input.addEventListener('blur',close);
      input.addEventListener('keydown',event => {
        if (event.isComposing || active !== input || popup.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); event.stopPropagation();
          if (matches.length) { index = (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length; highlight(); }
        }
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (index >= 0) select(index); }
      });
    }
    sources.set(input,options); input.value = options.includes(value) ? value : '';
    input.dataset.selected = input.value;
    input.placeholder = '输入姓名搜索并选择';
  }
  return {set,close,value:input => input.dataset.selected || ''};
}
