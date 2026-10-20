function cecDirty(){
 if(!cecDraft||cecDraft.readonly)return false;
 const initial=JSON.parse(cecDraftInitial),fields=['id','department','metricIndex','metric'];
 if(fields.some(field=>cecDraft[field]!==initial[field]))return true;
 return Object.entries(cecDraft.months).some(([month,value])=>{const old=cecCell(cecDraft.id,month);return value.target!==cecInput(old.targetCents)||value.actual!==cecInput(old.actualCents)||value.note!==old.note});
}
let cecDiscardAction=null;
function cecAskDiscard(action){cecDiscardAction=action;cecDiscard.showModal()}
function cecCloseEditor(){const close=()=>{cecDialog.close();cecDraft=null};if(cecDirty())cecAskDiscard(close);else close()}
cecDiscard.querySelector('[data-cec-continue]').onclick=()=>{cecDiscard.close();cecDiscardAction=null};
cecDiscard.querySelector('[data-cec-discard]').onclick=()=>{cecDiscard.close();const action=cecDiscardAction;cecDiscardAction=null;action?.()};
cecDialog.addEventListener('cancel',event=>{event.preventDefault();cecCloseEditor()});
cecDialog.addEventListener('input',event=>{
 const input=event.target;if(input.name==='metric')cecDraft.metric=input.value;if(input.dataset.cecMonth){cecDraft.months[input.dataset.cecMonth][input.dataset.cecField]=input.value;input.removeAttribute('aria-invalid');cecDraftTotals()}
 $('#cec-editor-error').textContent='';
});
cecDialog.addEventListener('change',event=>{
 const input=event.target;
 if(input.name==='department'&&cecDraft.isNew){cecDraft.department=input.value;return}
 if(input.id==='cec-editor-year'){cecDraft.year=Number(input.value);cecLoadDraftYear(cecDraft.year);cecPaintEditor()}
});
cecDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-cec-close]'))return cecCloseEditor();
 if(event.target.closest('#cec-start-edit')){cecDraft.readonly=false;cecDraftInitial=JSON.stringify(cecDraft);cecPaintEditor();return}
 if(!event.target.closest('#cec-save'))return;
 try{
  for(const input of cecDialog.querySelectorAll('[data-cec-field]:not([data-cec-field="note"])'))try{cecAmount(input.value,input.dataset.cecField==='target')}catch(error){input.setAttribute('aria-invalid','true');input.focus();throw error}
  cecMetricSave(cecDraft,cecDraft.months);cecDialog.close();cecDraft=null;cecRenderTable();toast('保存成功');
 }catch(error){$('#cec-editor-error').textContent=error.message}
});
$('#cec-page').addEventListener('input',event=>{if(event.target.id==='cec-query'){cecState.query=event.target.value;cecState.page=1;cecRenderTable()}});
$('#cec-page').addEventListener('change',event=>{
 const input=event.target;
 if(input.id==='cec-department'){cecState.department=input.value;cecState.page=1;cecRenderTable()}
 if(input.matches('[data-cec-time-year],[data-cec-time-value]')){
  if(input.hasAttribute('data-cec-time-year'))cecState.year=Number(input.value);
  else cecState.month=cecState.mode==='quarter'?Number(input.value)*3:Number(input.value);
  cecState.page=1;cecRenderPeriod();cecRenderTable();
 }
});
$('#cec-page').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.cecEdit)cecOpenEditor(button.dataset.cecEdit);
 if(button.dataset.cecView)cecOpenEditor(button.dataset.cecView,true);
 if(button.dataset.cecTimeMode){cecState.mode=button.dataset.cecTimeMode;cecState.page=1;cecRenderPeriod();cecRenderTable()}
 if(button.id==='cec-new')cecOpenEditor('',false,true);
 if(button.id==='cec-template')cecTemplate();
 if(button.id==='cec-import')cecOpenImport();
 if(button.id==='cec-reset'){Object.assign(cecState,{department:'',query:'',page:1});cecRenderPage()}
});
function cecOpenImport(){
 cecBatch=null;cecReadToken++;
 cecImportDialog.innerHTML=`<header><h2 id="cec-import-title">导入月度降本</h2><button class="cec-close" data-cec-import-close aria-label="关闭">×</button></header><div class="cec-import-body"><div class="cec-import-tools"><button class="cec-text-button" id="cec-import-template">下载模板</button></div><label class="cec-upload" id="cec-drop-zone"><input id="cec-file" type="file" accept=".xlsx,.csv"><span class="cec-upload-icon" aria-hidden="true">↑</span><strong>点击或拖拽文件到此处</strong><span id="cec-filename">支持 .xlsx、.csv，最大 5MB</span></label><div id="cec-import-result" aria-live="polite"></div><p id="cec-import-error" role="alert"></p></div><footer><span>空白金额保留原值</span><div><button class="cec-button" data-cec-import-close>取消</button><button class="cec-button primary" id="cec-confirm-import" disabled>确认导入</button></div></footer>`;
 cecImportDialog.showModal();
 const zone=$('#cec-drop-zone');zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('dragging')});zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));zone.addEventListener('drop',event=>{event.preventDefault();zone.classList.remove('dragging');if(event.dataTransfer.files.length!==1){$('#cec-import-error').textContent='请选择一个文件';return}cecReadImport(event.dataTransfer.files[0])});
}
function cecCloseImport(){cecReadToken++;cecImportDialog.close();cecBatch=null}
cecImportDialog.addEventListener('cancel',event=>{event.preventDefault();cecCloseImport()});
async function cecReadImport(file){
 if(!file)return;const token=++cecReadToken;cecBatch=null;$('#cec-confirm-import').disabled=true;$('#cec-import-error').textContent='';$('#cec-import-result').textContent='正在校验…';$('#cec-filename').textContent=file.name;
 try{
  const table=await cwReadFile(file);if(token!==cecReadToken)return;
  cecBatch=cecValidateImport(table);const {errors,entries}=cecBatch;
  if(errors.length){
   $('#cec-import-result').innerHTML=`<div class="cec-import-summary error"><strong>校验未通过</strong><span>${errors.length} 处错误，尚未导入</span><button id="cec-errors-download" class="cec-text-button">下载错误明细</button></div><div class="cec-preview-scroll"><table class="cec-table"><thead><tr><th>原始行号</th><th>降本指标</th><th>错误原因</th></tr></thead><tbody>${errors.slice(0,100).map(e=>`<tr><td>${e.row}</td><td>${esc(e.source?.['降本指标']||'—')}</td><td class="cec-error-text">${esc(e.message)}</td></tr>`).join('')}</tbody></table></div>`;
  }else{
   const updates=entries.filter(e=>e.kind==='更新').length;
   $('#cec-import-result').innerHTML=`<div class="cec-import-summary"><strong>校验通过</strong><span>${entries.length} 条月度数据 · 新增 ${entries.length-updates} 条 · 更新 ${updates} 条</span></div><div class="cec-preview-scroll"><table class="cec-table"><thead><tr>${['处理方式','降本指标','年月','目标金额（元）','实际降本金额（元）'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${entries.slice(0,100).map(e=>`<tr><td><span class="cec-import-kind">${e.kind}</span></td><td>${esc(e.name)}</td><td>${e.month}</td><td class="cec-number">${cecMoney(e.targetCents)}</td><td class="cec-number">${cecMoney(e.actualCents)}</td></tr>`).join('')}</tbody></table></div>${updates?'<label class="cec-overwrite"><input type="checkbox" id="cec-overwrite">确认更新以上已有指标的月度数据</label>':''}`;
   $('#cec-confirm-import').disabled=updates>0;
  }
 }catch(error){if(token!==cecReadToken)return;$('#cec-import-result').textContent='';$('#cec-import-error').textContent=error.message}
}
cecImportDialog.addEventListener('change',event=>{if(event.target.id==='cec-file')cecReadImport(event.target.files[0]);if(event.target.id==='cec-overwrite')$('#cec-confirm-import').disabled=!event.target.checked});
cecImportDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-cec-import-close]'))return cecCloseImport();
 if(event.target.closest('#cec-import-template'))cecTemplate();
 if(event.target.closest('#cec-errors-download')&&cecBatch)cecErrorDownload(cecBatch);
 if(event.target.closest('#cec-confirm-import')&&cecBatch&&!cecBatch.errors.length){
  const overwrite=$('#cec-overwrite');if(overwrite&&!overwrite.checked)return;
  try{const count=cecBatch.entries.length;cecCommit(cecBatch.next);cecCloseImport();cecRenderTable();toast('成功导入 '+count+' 条月度数据')}catch(error){$('#cec-import-error').textContent=error.message}
 }
});
// 后台审计只读暴露，供专项验证比对保存、刷新和看板汇总。
window.costConfigAudit=()=>({state:cecCopy(cecState),store:cecCopy(cecStore),metrics:cecCopy(ccItems)});
