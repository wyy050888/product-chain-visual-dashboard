/* Month/day cascader. Selecting a month is provisional; selecting a day commits both values. */
const MonthDayCascader = (() => {
  const label = (month, day) => month && day ? `${month} 月 ${day} 日` : '请选择月日';
  function field(prefix, month, day, index) {
    const title = `时段 ${index + 1} ${prefix === 's' ? '开始' : '结束'}日期`;
    return `<div class="month-day-field${month && day ? ' has-selection' : ''}" data-endpoint="${prefix}"><input type="hidden" data-field="${prefix}m" value="${month || ''}"><input type="hidden" data-field="${prefix}d" value="${day || ''}"><button type="button" class="cascader-trigger" aria-label="${title}" aria-haspopup="dialog" aria-expanded="false"><span>${label(month,day)}</span><span aria-hidden="true">⌄</span></button><button type="button" class="selection-clear" data-clear-date aria-label="清空${title}" title="清空" ${month && day ? '' : 'hidden'}>×</button></div>`;
  }
  function create(root) {
    const popup = document.createElement('div');
    popup.id = 'month-day-popup'; popup.className = 'cascader-popup'; popup.hidden = true;
    popup.setAttribute('role','dialog'); popup.setAttribute('aria-label','选择月份和日期');
    popup.innerHTML = '<div class="cascader-column"><div class="cascader-heading">月份</div><div class="cascader-options" data-months role="listbox" aria-label="月份"></div></div><div class="cascader-column"><div class="cascader-heading">日期</div><div class="cascader-options" data-days role="listbox" aria-label="日期"></div></div>';
    root.querySelector('#editor-overlay .editor').append(popup);
    let active = null, month = null;
    const months = popup.querySelector('[data-months]'), days = popup.querySelector('[data-days]');
    function close(focus = false) {
      if (!active) return;
      const trigger = active.querySelector('button');
      trigger.setAttribute('aria-expanded','false'); popup.hidden = true; active = null;
      if (focus && trigger.isConnected) trigger.focus();
    }
    function renderDays() {
      const prefix = active.dataset.endpoint;
      const savedMonth = +active.querySelector(`[data-field="${prefix}m"]`).value;
      const savedDay = +active.querySelector(`[data-field="${prefix}d"]`).value;
      const values = Array.from({length:Assignment.lastDay(2028,month)},(_,i) => i + 1);
      days.innerHTML = values.map(d => `<button type="button" role="option" data-day="${d}" aria-selected="${savedMonth === month && savedDay === d}">${d} 日</button>`).join('');
      months.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected',+b.dataset.month === month));
      days.scrollTop = 0;
      const selected = days.querySelector('[aria-selected="true"]');
      if (selected) days.scrollTop = Math.max(0,selected.offsetTop - days.offsetTop - 90);
    }
    function position() {
      const rect = active.querySelector('button').getBoundingClientRect(), width = Math.min(252,innerWidth - 24);
      const height = Math.min(302,innerHeight - 24);
      popup.style.width = `${width}px`; popup.style.height = `${height}px`;
      popup.style.left = `${Math.max(12,Math.min(rect.left,innerWidth - width - 12))}px`;
      popup.style.top = `${Math.max(12,rect.bottom + height + 6 <= innerHeight - 12 ? rect.bottom + 6 : rect.top - height - 6)}px`;
    }
    function open(field) {
      if (active === field) return close(true);
      close(); active = field;
      // Keep the picker within the active dialog so a covered drawer cannot make it inert.
      field.closest('[role="dialog"]').append(popup);
      month = +field.querySelector(`[data-field="${field.dataset.endpoint}m"]`).value || 1;
      field.querySelector('button').setAttribute('aria-expanded','true');
      field.querySelector('button').setAttribute('aria-controls',popup.id);
      months.innerHTML = Array.from({length:12},(_,i) => `<button type="button" role="option" data-month="${i + 1}" aria-selected="${month === i + 1}">${i + 1} 月<span aria-hidden="true">›</span></button>`).join('');
      popup.hidden = false; renderDays(); position();
      months.scrollTop = Math.max(0,(month - 3) * 32);
      months.querySelector(`[data-month="${month}"]`).focus({preventScroll:true});
    }
    root.querySelector('#segments').addEventListener('click',event => {
      const clear = event.target.closest('[data-clear-date]');
      if (clear) {
        const field = clear.closest('.month-day-field');
        close(); field.querySelectorAll('input').forEach(input => { input.value = ''; });
        field.classList.remove('has-selection'); clear.hidden = true;
        field.querySelector('.cascader-trigger>span').textContent = label(0,0);
        field.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));
        field.querySelector('.cascader-trigger').focus(); return;
      }
      const trigger = event.target.closest('.cascader-trigger');
      if (trigger) open(trigger.closest('.month-day-field'));
    });
    popup.addEventListener('click',event => {
      const button = event.target.closest('button'); if (!button || !active) return;
      if (button.dataset.month) { month = +button.dataset.month; renderDays(); return; }
      if (button.dataset.day !== undefined) {
        const field = active, prefix = field.dataset.endpoint, day = +button.dataset.day;
        field.querySelector(`[data-field="${prefix}m"]`).value = month;
        const input = field.querySelector(`[data-field="${prefix}d"]`); input.value = day;
        field.querySelector('.cascader-trigger>span').textContent = label(month,day);
        field.classList.add('has-selection'); field.querySelector('[data-clear-date]').hidden = false;
        close(true); input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    root.addEventListener('keydown',event => {
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (event.key === 'Tab') { close(true); return; }
      const button = event.target.closest('.cascader-options button'); if (!button) return;
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const all = [...button.parentElement.children], index = all.indexOf(button);
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length;
        all[target].focus();
      }
      if (event.key === 'ArrowRight' && button.dataset.month) {
        event.preventDefault(); month = +button.dataset.month; renderDays(); days.querySelector('button').focus();
      }
      if (event.key === 'ArrowLeft' && button.dataset.day !== undefined) {
        event.preventDefault(); months.querySelector(`[data-month="${month}"]`).focus();
      }
    },true);
    document.addEventListener('pointerdown',event => {
      if (active && !popup.contains(event.target) && !active.contains(event.target)) close();
    },true);
    root.addEventListener('scroll',() => {
      if (active) position();
    },true);
    window.addEventListener('resize',() => close());
    return {close};
  }
  return {field,create};
})();
