// 配置弹窗只编辑草稿；确认后持久化，取消、关闭与Esc均丢弃本次草稿。
(() => {
  const app = GoalPrototype, { $, escape: esc, goalConfigData: data } = app;
  const labels = new Map(data.items.map(item => [item.id, item.label]));
  let saved = [...data.defaults], draft = [], query = '', dragging = '', opener, onSave;
  const dialog = () => $('#goalConfigDialog');
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(data.storageKey));
      if (!Array.isArray(parsed)) return;
      const valid = [...new Set(parsed)].filter(id => labels.has(id));
      if (valid.length >= data.minimum) saved = valid;
    } catch (_) { /* 本地配置无效时沿用初始列。 */ }
  }
  const visibleGroups = () => data.groups.map(group => ({ ...group,
    items: group.items.filter(item => `${group.label} ${item.label}`.toLocaleLowerCase().includes(query)),
  })).filter(group => group.items.length);
  function renderOptions() {
    const groups = visibleGroups();
    $('#goalConfigGroups').innerHTML = groups.length ? groups.map(group => `<section class="goal-config-group">
      <label class="goal-config-group-heading"><input type="checkbox" data-goal-group="${group.id}"><span>${esc(group.label)}</span></label>
      <div class="goal-config-group-items">${group.items.map(item => `<label class="goal-config-option" title="${esc(item.label)}"><input type="checkbox" data-goal-item="${item.id}" ${draft.includes(item.id) ? 'checked' : ''}><span>${esc(item.label)}</span></label>`).join('')}</div>
    </section>`).join('') : '<div class="goal-config-empty">未找到匹配指标</div>';
    groups.forEach(group => {
      const control = $(`[data-goal-group="${group.id}"]`), count = group.items.filter(item => draft.includes(item.id)).length;
      control.checked = count === group.items.length; control.indeterminate = count > 0 && count < group.items.length;
    });
  }
  function renderSelection() {
    $('#goalConfigCount').textContent = draft.length;
    $('#goalConfigSelected').innerHTML = draft.map(id => `<li data-goal-selected="${id}" draggable="true">
      <button type="button" class="goal-config-drag" aria-label="排序${esc(labels.get(id))}" title="拖动排序，或聚焦后按上下方向键调整">≡</button>
      <span>${esc(labels.get(id))}</span><button type="button" class="goal-config-remove" data-goal-remove="${id}" aria-label="移除${esc(labels.get(id))}">×</button>
    </li>`).join('') || '<li class="goal-config-empty">尚未添加指标</li>';
    $('#goalConfigConfirm').disabled = draft.length < data.minimum;
    $('#goalConfigMessage').textContent = draft.length < data.minimum ? `请至少选择 ${data.minimum} 个指标` : '';
  }
  function refresh(focus) {
    const left = $('#goalConfigGroups').scrollTop, right = $('#goalConfigSelected').scrollTop;
    renderOptions(); renderSelection();
    $('#goalConfigGroups').scrollTop = left; $('#goalConfigSelected').scrollTop = right;
    if (focus) dialog().querySelector(focus)?.focus({ preventScroll: true });
  }
  function close() {
    dialog().close(); dragging = ''; opener?.focus({ preventScroll: true });
  }
  function open(callback) {
    opener = document.activeElement; onSave = callback; draft = [...saved]; query = '';
    $('#goalConfigSearch').value = ''; refresh(); dialog().showModal();
    $('#goalConfigSearch').focus();
  }
  function move(id, target) {
    const from = draft.indexOf(id), to = draft.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    draft.splice(from, 1); draft.splice(to, 0, id); refresh(`[data-goal-selected="${id}"] .goal-config-drag`);
  }
  function init() {
    load();
    $('#goalConfigClose').addEventListener('click', close); $('#goalConfigCancel').addEventListener('click', close);
    dialog().addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog().addEventListener('change', event => {
      const { goalItem: item, goalGroup: groupId } = event.target.dataset;
      const ids = item ? [item] : visibleGroups().find(group => group.id === groupId)?.items.map(item => item.id);
      if (!ids) return;
      draft = event.target.checked ? [...new Set([...draft, ...ids])] : draft.filter(id => !ids.includes(id));
      refresh(item ? `[data-goal-item="${item}"]` : `[data-goal-group="${groupId}"]`);
    });
    $('#goalConfigSelected').addEventListener('click', event => {
      const remove = event.target.closest('[data-goal-remove]'); if (!remove) return;
      const index = draft.indexOf(remove.dataset.goalRemove); draft = draft.filter(id => id !== remove.dataset.goalRemove);
      refresh(draft.length ? `[data-goal-remove="${draft[Math.min(index, draft.length - 1)]}"]` : '#goalConfigSearch');
    });
    const search = event => { if (event.isComposing) return; query = event.target.value.trim().toLocaleLowerCase(); renderOptions(); };
    $('#goalConfigSearch').addEventListener('input', search); $('#goalConfigSearch').addEventListener('compositionend', search);
    $('#goalConfigReset').addEventListener('click', () => { draft = [...data.defaults]; refresh('#goalConfigReset'); });
    $('#goalConfigConfirm').addEventListener('click', () => {
      if (draft.length < data.minimum) return;
      try { localStorage.setItem(data.storageKey, JSON.stringify(draft)); }
      catch (_) { $('#goalConfigMessage').textContent = '保存失败，请检查浏览器存储后重试'; return; }
      saved = [...draft]; close(); onSave?.([...saved]);
    });
    const list = $('#goalConfigSelected');
    list.addEventListener('dragstart', event => {
      const row = event.target.closest('[data-goal-selected]'); if (!row) return;
      dragging = row.dataset.goalSelected; event.dataTransfer.setData('text/plain', dragging); event.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging');
    });
    list.addEventListener('dragover', event => {
      const row = event.target.closest('[data-goal-selected]'); if (!dragging || !row) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); row.classList.add('drag-over');
    });
    list.addEventListener('drop', event => { event.preventDefault(); const row = event.target.closest('[data-goal-selected]'); if (row) move(dragging, row.dataset.goalSelected); dragging = ''; });
    list.addEventListener('dragend', () => { dragging = ''; list.querySelectorAll('.dragging,.drag-over').forEach(el => el.classList.remove('dragging', 'drag-over')); });
    list.addEventListener('keydown', event => {
      if (!event.target.matches('.goal-config-drag') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); const id = event.target.closest('li').dataset.goalSelected, index = draft.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1);
      if (draft[index]) move(id, draft[index]);
    });
  }
  app.goalConfig = { init, open, close, selection: () => [...saved] };
})();
