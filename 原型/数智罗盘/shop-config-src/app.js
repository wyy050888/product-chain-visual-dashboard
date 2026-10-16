(() => {
  const root = document.getElementById('shop-assignment'), $ = s => root.querySelector(s);
  const A = Assignment, V = View, key = activePlatform.storageKey;
  const seed = activePlatform.seed, regions = activePlatform.regions;
  initializePlatformTabs(root);
  const localDate = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const override = new URLSearchParams(location.search).get('date');
  let today = A.validDate(override) ? override : localDate();
  let shops = structuredClone(seed), selected = null, modifiedSort = 'desc';
  const modifiedTime = value => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
  let editorReturn = null, recordReturn = null, recordsFromEditor = false, confirmAction = null, confirmReturn = null, toastTimer;
  const shop = () => shops.find(s => s.id === selected);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    normalizeRegionNames(saved);
    // Normalize legacy end-day sentinels without changing effective dates or historical snapshots.
    if (Array.isArray(saved?.shops)) {
      for (const s of saved.shops) for (const c of s.configs || []) {
        if (c.type === 'annual' && Array.isArray(c.segments)) {
          c.segments = c.segments.map(segment => segment.ed === 0
            ? {...segment,ed:A.lastDay(2028,segment.em)} : segment);
        }
      }
    }
    if (Array.isArray(saved?.shops)) {
      // Merge by store ID so adding fixtures never discards existing user configurations.
      shops = seed.map(original => saved.shops.find(s => s.id === original.id && Array.isArray(s.configs)
        && s.configs.every(c => !A.validate(c,{configs:[]},A.shift(c.start,-1),{regions,supervisors}))) || structuredClone(original));
    }
  } catch { /* Invalid or unavailable storage does not prevent browsing the fixtures. */ }
  for (const s of shops) {
    // Enrich unchanged sample configurations only; unknown legacy operations remain unknown.
    for (const c of s.configs) {
      const original = seed.find(item => item.id === s.id)?.configs.find(item => item.id === c.id);
      const content = ({changedBy,changedAt,...rest}) => rest;
      if (original && c.changedBy === undefined && c.changedAt === undefined && JSON.stringify(content(c)) === JSON.stringify(content(original))) {
        c.changedBy = original.changedBy; c.changedAt = original.changedAt;
      }
    }
    if (s.updatedAt === undefined) {
      const original = seed.find(item => item.id === s.id);
      // Older local edits have no recorded operation time; do not invent one from effective dates.
      s.updatedAt = JSON.stringify(s.configs) === JSON.stringify(original?.configs) ? original.updatedAt : null;
    }
  }
  shops.forEach(s => { ConfigurationHistory.initialize(s,seed.find(item => item.id === s.id)); A.syncSnapshots(s,today); });
  try { localStorage.setItem(key,JSON.stringify({shops})); } catch { /* Save actions report storage failures explicitly. */ }

  function notice(message,tone = 'success') {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
    $('#toast').dataset.tone = tone;
    toastTimer = setTimeout(() => $('#toast').hidden = true,4000);
  }
  function commit(nextShops) {
    try {
      const merged = mergeShopChanges(shops,nextShops,JSON.parse(localStorage.getItem(key)));
      localStorage.setItem(key,JSON.stringify({shops:merged})); shops = merged; return true;
    } catch (error) {
      notice(error.message === 'SHOP_CONFLICT' ? '该店铺配置已更新，请刷新后核对再保存。' : '保存失败，请稍后重试。','error'); return false;
    }
  }
  function syncModal() {
    const confirming = !$('#confirm-overlay').hidden, editing = !$('#editor-overlay').hidden, recording = !$('#records-overlay').hidden, creating = !$('#new-config-overlay').hidden;
    $('.product-shell').inert = confirming || editing || recording || creating;
    $('#editor-overlay').inert = confirming || recording || creating;
    $('#new-config-overlay').inert = confirming;
    $('#records-overlay').inert = confirming;
    document.body.style.overflow = confirming || editing || recording || creating ? 'hidden' : '';
  }
  function ask(title,copy,action,yes = '确认',no = '返回') {
    $('#confirm-no').textContent = no;
    confirmReturn = document.activeElement; confirmAction = action;
    $('#confirm-title').textContent = title; $('#confirm-copy').textContent = copy; $('#confirm-yes').textContent = yes;
    $('#confirm-overlay').hidden = false; syncModal(); $('#confirm-no').focus();
  }
  function dismissConfirm() {
    $('#confirm-overlay').hidden = true; confirmAction = null; syncModal();
    if (confirmReturn?.isConnected) confirmReturn.focus();
  }
  const pagination = createPagination(root,renderList);
  function renderList() {
    if(activePlatform.readOnly)return ShopSettings.renderReadOnly(root,shops,pagination,notice);
    const query = $('#shop-search').value.trim().toLowerCase(), brand = $('#brand-filter').value, region = $('#region-filter').value, owner = $('#owner-filter').value.trim();
    ['#brand-filter','#region-filter'].forEach(s => $(s).classList.toggle('placeholder',!$(s).value));
    $('#modified-sort').dataset.direction = modifiedSort;
    $('#modified-sort').setAttribute('aria-label',`最近修改时间，当前${modifiedSort === 'desc' ? '倒序，点击改为正序' : '正序，点击改为倒序'}`);
    $('#modified-sort').closest('th').setAttribute('aria-sort',modifiedSort === 'desc' ? 'descending' : 'ascending');
    const rows = shops.filter(s => {
      const p = A.resolve(s,today);
      return ShopSettings.matches(s,root) && (!query || s.name.toLowerCase().includes(query) || s.id.includes(query)) && (!brand || s.brand === brand) && (!region || p?.region === region) && (!owner || p?.owner.includes(owner));
    }).sort((a,b) => {
      const left = modifiedTime(a.updatedAt), right = modifiedTime(b.updatedAt);
      if (left === null || right === null) return left === right ? seed.findIndex(s => s.id === a.id) - seed.findIndex(s => s.id === b.id) : left === null ? 1 : -1;
      return (modifiedSort === 'desc' ? right - left : left - right) || a.id.localeCompare(b.id);
    });
    $('#shop-rows').innerHTML = pagination.slice(rows).map(s => {
      const p = A.resolve(s,today), next = A.next(s,today);
      return `<tr data-shop="${s.id}"><td><div class="shop-identity"><span class="brand-mark" data-brand="${V.escape(s.brand)}" aria-hidden="true">${V.escape(s.brand || '店')}</span><div><div class="shop-name">${V.escape(s.name)}</div><div class="shop-id">ID：${s.id}</div></div></div></td><td>${V.escape(s.brand || '--')}</td><td>${V.escape(p?.region || '--')}</td><td><span>${V.escape(p?.owner || '--')}</span>${next ? `<div class="next-person">${V.date(next.date)} 起 → ${V.escape(V.person(next))}</div>` : ''}</td><td class="modified-time">${modifiedTime(s.updatedAt) === null ? '--' : V.dateTime(s.updatedAt)}</td>${ShopSettings.cells(s)}<td><div class="actions"><button class="text-button" data-open="${s.id}">配置</button></div></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty"><strong>没有匹配的店铺</strong></td></tr>';
  }
  const form = createConfigurationForm(root,{getToday:() => today,getShop:shop,directory:activePlatform});
  const records = createRecordsView(root,{getShops:() => shops,directory:activePlatform});
  const getBrands = () => [...new Set([...brandOptions,...shops.map(s => s.brand)].filter(Boolean))];
  function refreshBrandFilter() {
    const value = $('#brand-filter').value;
    $('#brand-filter').innerHTML = V.options(getBrands(),value,'请选择品牌');
  }
  const brandEditor = createBrandEditor(root,{getShop:shop,getBrands,onSave:value => {
    if(activePlatform.readOnly)return false;
    const next = structuredClone(shops), target = next.find(s => s.id === selected);
    target.brand = value; target.updatedAt = new Date().toISOString();
    if (!commit(next)) return false;
    refreshBrandFilter(); pagination.reset(); renderList();
    notice('品牌已保存，立即生效'); return true;
  }});
  function renderContext() {
    $('#current-context-person').textContent = A.resolve(shop(),today) ? V.person(A.resolve(shop(),today)) : '--';
    renderConfigurationList(root,shop(),today);
  }
  function showConfigurations() {
    form.closeTransient(); renderContext();
    $('#configuration-list').hidden = false;
    $('#config-form').hidden = true; $('#save-config').hidden = true;
    $('#cancel-form').textContent = '关闭'; $('#editor-title').textContent = '店铺负责配置';
    $('#new-config').focus({preventScroll:true});
  }
  let editingConfigId = null;
  function showConfiguration(config = null) {
    if (config && config.start <= today) return;
    editingConfigId = config?.id || null;
    showConfigurations(); form.load(config);
    $('#new-config-title').textContent = config ? '编辑配置' : '新增配置';
    $('#new-config-overlay [data-close-new]').setAttribute('aria-label',config ? '关闭编辑配置' : '关闭新增配置');
    $('#new-config-shop').textContent = `${shop().name}（${shop().id}）`;
    $('#new-config-content').append($('#config-form'));
    $('#new-config-dialog').append($('#editor-actions'));
    $('#config-form').hidden = false; $('#save-config').hidden = false;
    $('#cancel-form').textContent = '取消'; $('#new-config-overlay').hidden = false;
    $('#new-config-content').scrollTop = 0; syncModal(); $('#new-config-dialog').focus({preventScroll:true});
  }

  function openEditor(id) {
    clearTimeout(toastTimer); $('#toast').hidden = true;
    selected = id; editorReturn = document.activeElement;
    $('#configuration-history').open = false;
    $('#editor-shop').textContent = shop().name; brandEditor.reset();
    showConfigurations(); $('#editor-overlay').hidden = false; syncModal(); $('#editor-overlay .close').focus();
  }
  function leaveForm(action) {
    if (brandEditor.dirty()) {
      ask('放弃品牌修改？','尚未保存的品牌修改将丢失。',() => {brandEditor.reset(); action();},'放弃修改');
      return;
    }
    brandEditor.reset();
    if (!$('#config-form').hidden && form.dirty()) ask('放弃本次修改？','尚未保存的内容将丢失，已保存的配置不受影响。',action,'放弃修改');
    else action();
  }
  function closeEditor() {
    leaveForm(finishEditor);
  }
  function finishConfigurationModal() {
    form.closeTransient(); $('#new-config-overlay').hidden = true;
    $('#editor-overlay .dialog-content').append($('#config-form'));
    $('#editor-overlay .editor').append($('#editor-actions'));
    showConfigurations(); syncModal();
    const target = editingConfigId ? [...root.querySelectorAll('[data-config]')].find(button => button.dataset.config === editingConfigId) : null;
    (target || $('#new-config')).focus({preventScroll:true});
    editingConfigId = null;
  }
  function closeConfigurationModal() { leaveForm(finishConfigurationModal); }
  function finishForm() {
    if (!$('#new-config-overlay').hidden) finishConfigurationModal();
    else finishEditor();
  }
  function finishEditor() {
    form.closeTransient(); $('#editor-overlay').hidden = true; syncModal();
    // A list refresh replaces row buttons, so restore focus to the new matching control.
    const target = editorReturn?.isConnected ? editorReturn : $(`[data-open="${selected}"]`);
    (target || $('#shop-search')).focus({preventScroll:true});
  }
  function openRecords(id = null,fromEditor = false) {
    recordReturn = document.activeElement; recordsFromEditor = fromEditor;
    if (fromEditor) { form.closeTransient(); $('#editor-overlay').hidden = true; }
    records.open(id); $('#records-overlay').hidden = false; syncModal(); $('#records-overlay .close').focus();
  }
  function closeRecords() {
    $('#records-overlay').hidden = true;
    if (recordsFromEditor) $('#editor-overlay').hidden = false;
    syncModal(); if (recordReturn?.isConnected) recordReturn.focus();
  }
  function cancelConfig(id) {
    const c = shop().configs.find(c => c.id === id); if (!c || c.start <= today) return;
    ask('确认取消配置？','取消后无法恢复，请谨慎操作。',() => {
      if (!override) today = localDate();
      if (c.start <= today) { notice('该配置已生效，无法取消，请刷新后查看。','error'); return; }
      const next = structuredClone(shops), target = next.find(s => s.id === selected);
      target.configs = target.configs.filter(p => p.id !== id || p.start <= today);
      target.updatedAt = new Date().toISOString();
      ConfigurationHistory.append(target,{action:'cancel',before:c,after:null,changedBy:currentOperator,changedAt:target.updatedAt});
      if (commit(next)) { pagination.reset(); renderList(); showConfigurations(); notice('已取消待生效配置'); }
    },'确认取消','暂不取消');
  }
  root.addEventListener('click',event => {
    // Only the backdrop itself dismisses a drawer; clicks inside it must not bubble into dismissal.
    if (event.target === $('#editor-overlay')) return closeEditor();
    if (event.target === $('#records-overlay')) return closeRecords();
    if (event.target === $('#new-config-overlay')) return closeConfigurationModal();
    const button = event.target.closest('button'); if (!button) return;
    if(button.id==='shop-filter-reset'){for(const input of root.querySelectorAll('.filters input,.filters select'))input.value='';pagination.reset();renderList();return}
    if (button.hasAttribute('data-close')) return button.closest('#records-overlay') ? closeRecords() : closeEditor();
    if (button.hasAttribute('data-close-new')) return closeConfigurationModal();
    if (button.dataset.open&&!activePlatform.readOnly) openEditor(button.dataset.open);
    if (button.dataset.config) leaveForm(() => showConfiguration(shop().configs.find(c => c.id === button.dataset.config)));
    if (button.id === 'new-config') leaveForm(() => showConfiguration());
    if (button.dataset.cancelConfig) cancelConfig(button.dataset.cancelConfig);
    if (button.id === 'cancel-form') { if (!$('#new-config-overlay').hidden) closeConfigurationModal(); else closeEditor(); }
    if (button.id === 'records-open') openRecords();
    if (button.id === 'shop-records') leaveForm(() => openRecords(selected,true));
    if (button.id === 'confirm-no') dismissConfirm();
    if (button.id === 'confirm-yes') { const action = confirmAction; dismissConfirm(); action?.(); }
    if (button.id === 'modified-sort') { modifiedSort = modifiedSort === 'desc' ? 'asc' : 'desc'; pagination.reset(); renderList(); }
  });
  $('#config-form').addEventListener('submit',event => {
    event.preventDefault();
    if (activePlatform.readOnly || $('#editor-overlay').hidden || $('#config-form').hidden) return;
    if (!override) today = localDate();
    if (!form.dirty() && shop().configs.length) { finishForm(); return; }
    const c = form.draft(), error = form.validate(c);
    if (error) { $('#form-error').textContent = error; $('#form-error').hidden = false; $('#form-error').scrollIntoView({block:'nearest'}); return; }
    const next = structuredClone(shops), target = next.find(s => s.id === selected);
    const action = c.id ? 'update' : 'create';
    const before = c.id ? target.configs.find(p => p.id === c.id) : null;
    c.changedBy = currentOperator; c.changedAt = new Date().toISOString();
    if (c.id) target.configs = target.configs.map(p => p.id === c.id ? c : p);
    else { c.id = `config-${crypto.randomUUID()}`; target.configs.push(c); }
    target.updatedAt = c.changedAt;
    ConfigurationHistory.append(target,{action,before,after:c,changedBy:currentOperator,changedAt:c.changedAt});
    A.syncSnapshots(target,today);
    if (commit(next)) { pagination.reset(); renderList(); finishForm(); notice(c.start === today ? '已保存，今日生效' : `已保存，将于 ${V.date(c.start)} 自动生效`); }
  });
  refreshBrandFilter();
  $('#region-filter').innerHTML = V.options(regions,'',activePlatform.placeholder);
  ['#shop-search','#brand-filter','#region-filter','#owner-filter','#promotion-filter','#category-filter','#assessed-filter'].forEach(s => $(s).addEventListener('input',() => { pagination.reset(); renderList(); }));
  root.addEventListener('keydown',event => {
    const modal = !$('#confirm-overlay').hidden ? $('#confirm-overlay') : !$('#new-config-overlay').hidden ? $('#new-config-overlay') : !$('#records-overlay').hidden ? $('#records-overlay') : !$('#editor-overlay').hidden ? $('#editor-overlay') : null;
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); if (modal.id === 'confirm-overlay') dismissConfirm(); else if (modal.id === 'new-config-overlay') closeConfigurationModal(); else if (modal.id === 'records-overlay') closeRecords(); else closeEditor(); }
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('button,input,select,summary')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!controls.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Reconcile missed transitions on load and when a live page crosses midnight.
  setInterval(() => {
    if (override || today === localDate()) return;
    today = localDate(); const next = structuredClone(shops); next.forEach(s => A.syncSnapshots(s,today));
    if (!commit(next)) shops = next;
    renderList(); if (!$('#editor-overlay').hidden) renderContext();
    if (!$('#records-overlay').hidden) records.render();
  },30000);
  ShopSettings.bind(root,{getShops:()=>shops,refresh:()=>{pagination.reset();renderList()},notice});
  if(activePlatform.readOnly){$('#owner-filter-label').textContent='店铺策略';$('#owner-filter').placeholder='请输入策略姓名'}
  createClearableSelects(root);
  renderList();
})();
