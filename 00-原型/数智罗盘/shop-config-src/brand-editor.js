// Brand is an immediate store attribute, independent of dated responsibility configurations.
function createBrandEditor(root,{getShop,getBrands,onSave}) {
  const host = root.querySelector('#editor-meta');
  let editing = false;
  function render() {
    const shop = getShop();
    host.innerHTML = `<span>ID：${View.escape(shop.id)}</span><span class="brand-attribute">品牌：${editing
      ? `<select id="brand-edit-value" aria-label="选择品牌">${View.options(getBrands(),shop.brand || '','请选择品牌')}</select><button type="button" class="text-button" data-brand-save>保存</button><button type="button" class="text-button secondary" data-brand-cancel>取消</button>`
      : `<span>${View.escape(shop.brand || '--')}</span><button type="button" class="text-button" data-brand-edit aria-label="编辑品牌">编辑</button>`}</span><span id="brand-error" class="brand-error" role="alert" hidden>请选择品牌</span>`;
  }
  function close(focus = false) {
    editing = false; render();
    if (focus) host.querySelector('[data-brand-edit]').focus({preventScroll:true});
  }
  host.addEventListener('click',event => {
    if (event.target.closest('[data-brand-edit]')) { editing = true; render(); }
    if (event.target.closest('[data-brand-cancel]')) close(true);
    if (event.target.closest('[data-brand-save]')) {
      const value = host.querySelector('#brand-edit-value').value;
      if (!getBrands().includes(value)) { host.querySelector('#brand-error').hidden = false; return; }
      if (value === getShop().brand || onSave(value)) close(true);
    }
  });
  host.addEventListener('change',() => { host.querySelector('#brand-error').hidden = true; });
  return {
    reset:() => close(),
    dirty:() => editing && host.querySelector('#brand-edit-value').value !== (getShop().brand || '')
  };
}
