// 列表管理字段不进入导入模板；缺失的历史操作信息不补造。
function ssiListFieldMarkup(key,row){
 if(key==='actions')return `<button type="button" class="link" data-ssi-remove="${esc(ssiKey(row))}">移除</button>`;
 if(key==='updatedAt'){
  const at=Date.parse(row.updatedAt);return Number.isFinite(at)?esc(new Date(at).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).slice(2).replaceAll('-','/')):'—';
 }
 return ssiFieldMarkup(key,row);
}
function ssiRemoveRelation(key,revision){
 if(revision!==ssiStore.revision||ssiLoad().revision!==ssiStore.revision)throw Error('名单已更新，请刷新后重试');
 const row=[...ssiStore.rows,...ssiSeedRows.primary,...ssiSeedRows.secondary].find(row=>ssiKey(row)===key);
 if(!row||ssiRemoved(row))throw Error('该关系已移除，请刷新后重试');
 const seed=ssiSeedRows[row.tier].find(item=>ssiKey(item)===key),removed=new Set(ssiStore.removed||[]);removed.add(key);if(seed?.sourceKey)removed.add(seed.sourceKey);
 const next={...ssiStore,revision:ssiStore.revision+1,rows:ssiStore.rows.filter(item=>ssiKey(item)!==key),removed:[...removed]};
 try{localStorage.setItem(SSI_STORAGE,JSON.stringify(next))}catch(_){throw Error('移除失败，请重试')}
 ssiStore=next;ssiApply();scpRepaint();ssiRenderTable();
}
const ssiRemoveDialog=document.createElement('dialog');ssiRemoveDialog.id='ssi-remove-dialog';ssiRemoveDialog.className='klc-dialog';ssiRemoveDialog.setAttribute('aria-labelledby','ssi-remove-title');document.body.append(ssiRemoveDialog);
function ssiOpenRemove(key){
 const row=ssiRows().find(item=>ssiKey(item)===key);if(!row)return;
 const category=row.admissionCategory||row.categoryPath,material=row.admissionMaterial||row.cooperationMaterial,brand=row.availableBrand||row.brand;
 ssiRemoveDialog.innerHTML=`<header><h2 id="ssi-remove-title">移除供应商关系？</h2><button type="button" class="klc-close" data-ssi-remove-close aria-label="关闭">×</button></header><div class="klc-dialog-body"><p>${esc(row.name)}</p><p>${[category,material,brand,row.productCode].filter(Boolean).map(esc).join(' · ')}</p><p>移除后，这条关系不再计入供应链看板统计。同一供应商的其他关系保留。</p></div><footer><p class="klc-error" role="alert"></p><div><button type="button" class="klc-button" data-ssi-remove-close>取消</button><button type="button" class="klc-button danger" id="ssi-remove-confirm">移除</button></div></footer>`;
 const revision=ssiStore.revision;
 $('#ssi-remove-confirm').onclick=()=>{try{ssiRemoveRelation(key,revision);ssiRemoveDialog.close()}catch(error){ssiRemoveDialog.querySelector('.klc-error').textContent=error.message}};
 ssiRemoveDialog.showModal();
}
$('#ssi-body').addEventListener('click',event=>{const button=event.target.closest('[data-ssi-remove]');if(button)ssiOpenRemove(button.dataset.ssiRemove)});
ssiRemoveDialog.addEventListener('click',event=>{if(event.target.closest('[data-ssi-remove-close]'))ssiRemoveDialog.close()});
