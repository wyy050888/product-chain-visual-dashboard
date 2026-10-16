(() => {
  const app = GoalPrototype, { $, escape: esc } = app;
  let dialog, config, selected, opener;
  // 只解析网址中的商品 ID，不发起网络请求，也不把任意网址当成主数据。
  function searchTerm(text) {
    const value = text.trim();
    try {
      const url = new URL(value);
      return url.searchParams.get('id') || url.searchParams.get('itemId') || url.searchParams.get('item_id') || url.searchParams.get('goods_id') || url.pathname.match(/(?:\/)(\d+)(?:\.html)?\/?$/)?.[1] || value;
    } catch { return value; }
  }
  function filtered() {
    const term = searchTerm($('#linkPickerSearch').value).toLocaleLowerCase();
    const filter = $('#linkPickerFilter').value;
    return config.rows.filter(row => (filter === 'all' || (filter === 'previous' ? row.previousReported : row.currentReported)) && (!term || `${row.linkName} ${row.linkId}`.toLocaleLowerCase().includes(term)))
      .sort((a, b) => Number(b.linkId === term) - Number(a.linkId === term) || Number(Boolean(a.disabledReason)) - Number(Boolean(b.disabledReason)));
  }
  function renderSelection() {
    $('#linkPickerConfirm').textContent = config.single ? '确认选择' : `确认添加${selected.size ? `（${selected.size}）` : ''}`;
    $('#linkPickerConfirm').disabled = !selected.size;
  }
  function thumbnail(row) {
    const photo = row.thumbnail;
    if (!photo?.src) return '<span class="link-picker-thumb is-missing">暂无图片</span>';
    const tile = Number.isInteger(photo.tile) && photo.tile >= 0 && photo.tile < 9 ? photo.tile : null;
    return `<span class="link-picker-thumb"><img src="${esc(photo.src)}" alt="${esc(row.linkName)}商品图" ${tile === null ? '' : `class="is-atlas" style="left:-${tile % 3 * 100}%;top:-${Math.floor(tile / 3) * 100}%"`} decoding="async"></span>`;
  }
  async function copyId(button) {
    const id = button.dataset.copyLink;
    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw Error('clipboard unavailable');
      await navigator.clipboard.writeText(id); copied = true;
    } catch {
      // 本地file预览的剪贴板兼容；临时节点必须位于当前模态框内。
      const input = document.createElement('textarea'); input.value = id; input.className = 'link-picker-copy-source';
      dialog.append(input); input.select();
      try { copied = document.execCommand('copy'); } catch { /* 失败时保留可手动复制的ID。 */ }
      input.remove(); button.focus({ preventScroll: true });
    }
    button.title = copied ? '已复制' : '复制失败，请手动复制ID';
    button.setAttribute('aria-label', button.title);
    button.classList.toggle('is-copied', copied);
    $('#linkPickerCopyStatus').textContent = copied ? `已复制 ${id}` : button.title;
  }
  function render() {
    const rows = filtered();
    $('#linkPickerRows').innerHTML = rows.map(row => `<label class="link-picker-row ${row.disabledReason ? 'is-disabled' : ''}">
      <input type="${config.single ? 'radio' : 'checkbox'}" name="pickerChoice" value="${esc(row.linkId)}" ${selected.has(row.linkId) ? 'checked' : ''} ${row.disabledReason ? 'disabled' : ''} aria-label="${esc(row.linkName)} ${esc(row.linkId)}">
      ${thumbnail(row)}
      <span class="link-picker-identity"><strong title="${esc(row.linkName)}">${esc(row.linkName)}</strong><span class="link-picker-meta"><small>ID：${esc(row.linkId)}</small><button type="button" class="link-picker-copy" data-copy-link="${esc(row.linkId)}" title="复制ID" aria-label="复制链接ID ${esc(row.linkId)}"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M10 3V2H2v9h1"/></svg></button><span class="link-picker-statuses">${row.previousReported ? '<span class="link-picker-status is-previous">上月填报</span>' : ''}${row.currentReported ? '<span class="link-picker-status is-current">本月已填报</span>' : ''}${row.added ? '<span class="link-picker-status is-added">本次已添加</span>' : ''}</span></span></span>
    </label>`).join('') || `<div class="link-picker-empty">${config.rows.length ? '未找到匹配链接，请调整筛选或关键词。' : '当前店铺暂无链接。'}</div>`;
    const unavailable = config.rows.length > 0 && config.rows.every(row => row.disabledReason);
    $('#linkPickerNotice').hidden = !unavailable || Boolean($('#linkPickerSearch').value.trim()) || $('#linkPickerFilter').value !== 'all';
    $('#linkPickerNotice').textContent = config.rows.every(row => row.disabledReason === '本月已填报') ? '本月已全部填报，请回列表修改目标。' : '链接均已填报或已添加，无可新增链接。';
    renderSelection();
  }
  function close() { dialog.close(); opener?.focus({ preventScroll: true }); }
  function init() {
    dialog = document.createElement('dialog');
    dialog.id = 'linkPicker'; dialog.className = 'entry-modal link-picker';
    dialog.setAttribute('aria-labelledby', 'linkPickerTitle');
    dialog.innerHTML = `<header class="dialog-heading"><div class="link-picker-heading"><h2 id="linkPickerTitle">选择核心链接</h2><div id="linkPickerScope"></div></div><select id="linkPickerFilter" aria-label="链接填报状态"><option value="all">全部链接</option><option value="previous">上月填报</option><option value="current">本月已填报</option></select><button type="button" class="dialog-close" data-picker-close aria-label="关闭链接选择">×</button></header>
      <div class="dialog-body link-picker-body">
        <input id="linkPickerSearch" type="search" aria-label="搜索链接名称、ID或商品网址" placeholder="搜索链接名称 / ID，或粘贴商品网址" autocomplete="off">
        <p id="linkPickerNotice" class="link-picker-notice" role="status" hidden></p>
        <div id="linkPickerRows" class="link-picker-rows"></div>
        <span id="linkPickerCopyStatus" class="link-picker-sr-only" role="status"></span>
      </div><footer class="dialog-footer"><div class="actions"><button type="button" class="btn" data-picker-close>取消</button><button type="button" class="btn primary" id="linkPickerConfirm" aria-live="polite">确认添加</button></div></footer>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); close(); }
    });
    dialog.addEventListener('click', event => {
      const copy = event.target.closest('[data-copy-link]');
      if (copy) { event.preventDefault(); event.stopPropagation(); copyId(copy); return; }
      if (event.target.closest('[data-picker-close]')) close();
    });
    $('#linkPickerRows').addEventListener('error', event => {
      if (event.target.tagName !== 'IMG') return;
      const frame = event.target.parentElement;
      frame.classList.add('is-missing'); frame.textContent = '暂无图片';
    }, true);
    $('#linkPickerRows').addEventListener('change', event => {
      const input = event.target;
      if (config.single) selected.clear();
      if (input.checked) selected.add(input.value); else selected.delete(input.value);
      renderSelection();
    });
    const search = () => { render(); $('#linkPickerRows').scrollTop = 0; };
    $('#linkPickerFilter').addEventListener('change', search);
    $('#linkPickerSearch').addEventListener('input', event => { if (!event.isComposing) search(); });
    $('#linkPickerSearch').addEventListener('compositionend', search);
    $('#linkPickerSearch').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        const matches = filtered().filter(row => !row.disabledReason);
        if (matches.length === 1) { if (config.single) selected.clear(); selected.add(matches[0].linkId); render(); }
      }
    });
    $('#linkPickerConfirm').addEventListener('click', () => { const ids = [...selected]; close(); config.onConfirm(ids); });
  }
  function open(next) {
    if (!dialog) init();
    config = next; selected = new Set(next.selected || []); opener = document.activeElement;
    $('#linkPickerTitle').textContent = next.single ? '更换核心链接' : '选择核心链接';
    const shop = next.parent, icon = { 天猫: 'tmall.png', 京东: 'jd.ico', 拼多多: 'pinduoduo.png' }[shop.channel];
    $('#linkPickerScope').innerHTML = `${icon ? `<span class="link-picker-platform-icon"><img src="assets/channels/${icon}" alt=""></span>` : ''}<span class="link-picker-shop-copy"><strong title="${esc(shop.shop)}">${esc(shop.shop)}</strong><span class="link-picker-shop-meta"><span>${esc(shop.shopCode)}</span><span class="link-picker-platform">${esc(shop.channel)}</span></span></span>`;
    $('#linkPickerSearch').value = '';
    $('#linkPickerFilter').value = 'all';
    $('#linkPickerCopyStatus').textContent = '';
    app.editorCombobox.close(); render(); $('#linkPickerRows').scrollTop = 0;
    dialog.showModal(); $('#linkPickerSearch').focus();
  }
  app.linkPicker = { open };
})();
