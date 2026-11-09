// 行内特批使用小型确认框，固定当前产品和考核期，不再重复选择业务对象。
let nspApprovalDialog=null;
function nspApprovalPeriodLabel(assessment){const range=nspApprovalPeriodRange(assessment.key);return assessment.key.slice(0,4)+(range.annual?'年度':'年'+assessment.key.slice(5))}
function nspApprovalActions(product,assessment){
 const fact=product.successAssessment;
 const action=fact.approval?'revoke':!fact.success?'approve':'';
 return '<span class="nsp-assessment-actions"><button type="button" class="link" data-nsp-assess-product="'+esc(product.spuId)+'">查看</button>'
  +(action?'<button type="button" class="link" data-nsp-approval="'+action+'" data-nsp-approval-spu="'+esc(product.spuId)+'" aria-label="'+esc((action==='approve'?'特批成功':'撤销特批')+' '+product.name+' '+nspApprovalPeriodLabel(assessment))+'">'+(action==='approve'?'特批成功':'撤销特批')+'</button>':'')+'</span>';
}
function nspOpenApproval(product,assessment,revoke,trigger,onSaved){
 nspApprovalDialog?.close();
 const approval=product.successAssessment.approval,title=revoke?'撤销特批':'特批成功',dialog=document.createElement('dialog');
 dialog.className='nsp-approval-dialog';dialog.setAttribute('aria-labelledby','nsp-approval-title');
 dialog.innerHTML='<form novalidate><header><h3 id="nsp-approval-title">'+title+'</h3><button type="button" class="btn small" data-nsp-approval-close aria-label="关闭'+title+'">×</button></header><div class="nsp-approval-body">'
  +'<dl><dt>产品</dt><dd>'+esc(product.name)+'</dd><dt>考核期间</dt><dd>'+esc(nspApprovalPeriodLabel(assessment))+'</dd></dl>'
  +(revoke?'<p class="nsp-approval-reason">特批原因：'+esc(approval?.reason||'—')+'</p><p>撤销后按实际考核结果重新判定。</p>':'<label>特批原因 <span class="red">*</span><textarea name="reason" aria-label="特批原因" required maxlength="500" rows="3"></textarea></label>')
  +'<p class="nsp-approval-error" role="alert" data-nsp-approval-error></p></div><footer><button type="button" class="btn" data-nsp-approval-close>取消</button><button type="submit" class="btn primary">'+(revoke?'确认撤销':'确认特批')+'</button></footer></form>';
 const root=trigger.closest('.nsp-assessment');
 dialog.querySelectorAll('[data-nsp-approval-close]').forEach(button=>button.onclick=()=>dialog.close());
 dialog.addEventListener('keydown',event=>{if(['Escape','Tab'].includes(event.key))event.stopPropagation()});
 dialog.addEventListener('close',()=>{
  dialog.remove();if(nspApprovalDialog===dialog)nspApprovalDialog=null;
  requestAnimationFrame(()=>{const target=trigger.isConnected?trigger:root?.querySelector('[data-nsp-assess-result][aria-selected="true"]');target?.focus({preventScroll:true})});
 },{once:true});
 dialog.querySelector('form').onsubmit=event=>{
  event.preventDefault();const error=dialog.querySelector('[data-nsp-approval-error]'),reason=dialog.querySelector('[name=reason]')?.value;
  try{nspSaveApproval(product,assessment,reason,revoke)}catch(failure){error.textContent=failure.message;return}
  dialog.close();onSaved();toast(revoke?'已撤销本期特批':'已设为本期特批成功');
 };
 document.body.append(dialog);nspApprovalDialog=dialog;dialog.showModal();
 (dialog.querySelector('[name=reason]')||dialog.querySelector('[type=submit]')).focus();
}
window.dashboardNewProductApprovalSnapshot=nspApprovalAudit;
