function cecCloseEditor(){cecDialog.close();cecDraft=null}
cecDialog.addEventListener('cancel',event=>{event.preventDefault();cecCloseEditor()});
cecDialog.addEventListener('change',event=>{
 if(event.target.id==='cec-editor-year'){cecDraft.year=Number(event.target.value);cecLoadDraftYear(cecDraft.year);cecPaintEditor()}
});
cecDialog.addEventListener('click',event=>{if(event.target.closest('[data-cec-close]'))cecCloseEditor()});
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
 if(button.dataset.cecView)cecOpenEditor(button.dataset.cecView);
 if(button.dataset.cecTimeMode){cecState.mode=button.dataset.cecTimeMode;cecState.page=1;cecRenderPeriod();cecRenderTable()}
 if(button.id==='cec-template')cecTemplate();
 if(button.id==='cec-import')cecOpenImport();
 if(button.id==='cec-reset'){Object.assign(cecState,{department:'',category:'',query:'',page:1});cecRenderPage()}
});
function cecOpenImport(){
 cecBatch=null;cecReadToken++;
 cecImportDialog.innerHTML=`<header><h2 id="cec-import-title">导入目标与实际</h2><button class="cec-close" data-cec-import-close aria-label="关闭">×</button></header><div class="cec-import-body"><div class="cec-import-tools"><button class="cec-text-button" id="cec-import-template">下载模板</button></div><label class="cec-upload" id="cec-drop-zone"><input id="cec-file" type="file" accept=".xlsx,.csv"><span class="cec-upload-icon" aria-hidden="true">↑</span><strong>点击或拖拽文件到此处</strong><span id="cec-filename">支持 .xlsx、.csv，最大 5MB</span></label><div id="cec-import-result" aria-live="polite"></div><p id="cec-import-error" role="alert"></p></div><footer><span>按部门分Sheet，导入时读取全部Sheet；空白金额保留原值</span><div><button class="cec-button" data-cec-import-close>取消</button><button class="cec-button primary" id="cec-confirm-import" disabled>确认导入</button></div></footer>`;
 cecImportDialog.showModal();
 uiBindImportFlow({dialog:cecImportDialog,input:$('#cec-file'),button:$('#cec-confirm-import'),read:cecReadImportFile,parse:cecValidateImport,commit:batch=>cecCommit(batch.next),done:()=>{cecCloseImport();cecRenderTable()}});
}
function cecCloseImport(){cecReadToken++;cecImportDialog.close();cecBatch=null}
cecImportDialog.addEventListener('cancel',event=>{event.preventDefault();cecCloseImport()});
cecImportDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-cec-import-close]'))cecCloseImport();
 if(event.target.closest('#cec-import-template'))cecTemplate();
});
// 后台审计只读暴露，供专项验证比对保存、刷新和看板汇总。
window.costConfigAudit=()=>({state:cecCopy(cecState),store:cecCopy(cecStore),metrics:cecCopy(ccItems)});
