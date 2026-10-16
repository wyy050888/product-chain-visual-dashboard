// Shared clearing behavior for native business selects and searchable person pickers.
function createClearableSelects(root) {
  const selector = 'select:not(.shop-pagination select):not([data-shop-category]), input[role="combobox"]';
  const controls = new WeakMap();
  function refresh() {
    root.querySelectorAll(selector).forEach(input => {
      let button = controls.get(input);
      if (!button) {
        const wrapper = input.closest('.person-picker') || document.createElement('span');
        if (!wrapper.classList.contains('person-picker')) {
          wrapper.className = 'clearable-select'; input.before(wrapper); wrapper.append(input);
        }
        button = document.createElement('button');
        button.type = 'button'; button.className = 'selection-clear'; button.textContent = '×';
        const label = input.closest('label')?.cloneNode(true);
        label?.querySelectorAll('select,input,button,.person-picker,.clearable-select').forEach(el => el.remove());
        const name = input.getAttribute('aria-label') || label?.textContent.replace(/\*/g,'').trim() || '选择';
        button.setAttribute('aria-label',`清空${name}`); button.title = '清空';
        button.addEventListener('click',event => {
          event.preventDefault(); event.stopPropagation();
          input.value = '';
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
          refresh(); input.focus({preventScroll:true});
        });
        wrapper.append(button); controls.set(input,button);
      }
      const filled = !!input.value && !input.disabled;
      button.hidden = !filled;
      input.parentElement.classList.toggle('has-selection',filled);
    });
  }
  root.addEventListener('input',refresh);
  root.addEventListener('change',refresh);
  // Dynamic form rows and programmatic option/person updates use the same control.
  new MutationObserver(refresh).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-selected','disabled']});
  refresh();
}
