$('#cec-page').addEventListener('input',event=>{if(event.target.id==='cec-query'){cecState.query=event.target.value;cecState.page=1;cecRenderTable()}});
$('#cec-page').addEventListener('change',event=>{
 const input=event.target;
 if(input.hasAttribute('data-cec-time-year')){
  cecState.year=Number(input.value);
  cecState.page=1;cecRenderPeriod();cecRenderTable();
 }
});
$('#cec-page').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-cec-department')){cecState.department=button.dataset.cecDepartment;cecState.page=1;cecRenderTable()}
 if(button.dataset.cecTimeMode){cecState.mode=button.dataset.cecTimeMode;cecState.page=1;cecRenderPeriod();cecRenderTable()}
 if(button.dataset.cecTab)cecSwitchTab(button.dataset.cecTab);
 if(button.id==='cec-template')cecDownloadSplitTemplate();
 if(button.id==='cec-import')cecOpenImport();
 if(button.id==='cec-reset'){Object.assign(cecState,{department:'',category:'',query:'',page:1});cecRenderPage()}
});
function cecOpenImport(){
 cecBatch=null;cecReadToken++;
 const kind=cecState.tab,actual=kind==='actual';cecImportDialog.dataset.kind=kind;
 cecImportDialog.innerHTML=`<header><h2 id="cec-import-title">导入${actual?'实际值':'目标值'}</h2><button class="cec-close" data-cec-import-close aria-label="关闭">×</button></header><div class="cec-import-body"><div class="cec-import-tools"><button class="cec-text-button" id="cec-import-template">下载模板</button></div><p class="cec-import-notice ui-import-coverage" role="note">${actual?'导入将按文件涉及月份整月覆盖所有部门的实际值，未列出的当月明细也会移除；其他月份和目标值保留。请上传相关月份的完整明细。':'导入将覆盖文件中已填报部门对应年度的目标值；年度目标须等于12个月目标合计，金额全部留空的行不更新；实际值保留。'}整批校验通过后保存，导入失败不修改已有数据。</p><label class="cec-upload" id="cec-drop-zone"><input id="cec-file" type="file" accept="${actual?'.xlsx':'.xlsx,.csv'}"><span class="cec-upload-icon" aria-hidden="true">↑</span><strong>点击或拖拽文件到此处</strong><span id="cec-filename">支持 ${actual?'.xlsx':'.xlsx、.csv'}，最大 5MB</span></label><div id="cec-import-result" aria-live="polite"></div><p id="cec-import-error" role="alert"></p></div><footer><div><button class="cec-button" data-cec-import-close>取消</button><button class="cec-button primary" id="cec-confirm-import" disabled>确认导入</button></div></footer>`;
 cecImportDialog.showModal();
 $('#cec-file').dataset.uploadModule=cecImportModule(kind);
 if(actual)$('#cec-file').dataset.uploadHint='支持 .xlsx，最大5MB；按部门分Sheet填写';
 uiBindImportFlow({dialog:cecImportDialog,input:$('#cec-file'),button:$('#cec-confirm-import'),read:file=>cecReadSplitFile(file,kind),parse:actual?cecValidateSplitActual:cecValidateSplitTarget,commit:batch=>cecCommit(batch.next),historyMeta:cecSplitHistoryMeta,done:()=>{cecCloseImport();cecRenderTable()}});
}
function cecCloseImport(){cecReadToken++;cecImportDialog.close();cecBatch=null}
cecImportDialog.addEventListener('cancel',event=>{event.preventDefault();cecCloseImport()});
cecImportDialog.addEventListener('click',event=>{
 if(event.target.closest('[data-cec-import-close]'))cecCloseImport();
 if(event.target.closest('#cec-import-template'))cecDownloadSplitTemplate(cecImportDialog.dataset.kind);
});
// 后台审计只读暴露，供专项验证比对保存、刷新和看板汇总。
window.costConfigAudit=()=>({state:cecCopy(cecState),store:cecCopy(cecStore),metrics:cecCopy(ccItems)});
