let upRuleRevision=0;
function upOpenTargets(state,refresh) {
  const p=upProduct(upSpus.get(state.spuId));
  openModal(p.name+' · 总退货率目标',`<form id="up-target-form" class="up-target-form"><div class="up-target-fields">${qrPlatforms.map(platform=>`<label>${platform}<input type="number" min="0" max="100" step="0.01" required data-up-target="${platform}" value="${qrbTarget(p,platform)}"><span>%</span></label>`).join('')}</div><div id="up-target-error" role="alert"></div></form>`,true);
  $('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn primary small" id="up-target-save">保存目标</button>');
  $('#up-target-save').onclick=()=>{
    const form=$('#up-target-form');if(!form.reportValidity())return;
    const next={...qrbTargets};
    for(const input of form.querySelectorAll('[data-up-target]')) next[p.spuId+'|'+input.dataset.upTarget]=Number(input.value);
    try { localStorage.setItem('quality-return-targets-reference-20261010',JSON.stringify(next)); }
    catch(_) { $('#up-target-error').textContent='保存失败，请检查浏览器存储空间';return }
    qrbTargets=next;qrbCache.clear();rrCached=null;upRuleRevision++;renderRisks();closeModal();refresh();
  };
}
