function klcAfterChange(){klcRenderRows();rpHidePddLinks();withPeriod('risk',()=>renderRisks())}
function klcError(dialog,error){dialog.querySelector('.klc-error').textContent=error.message}
$('#klc-query').oninput=e=>{klcState.query=e.target.value;klcState.page=1;klcRenderRows()};
$('#klc-shop').oninput=e=>{klcState.shopQuery=e.target.value;klcState.page=1;klcRenderRows()};
uiBindNaturalPeriod({trigger:$('#klc-month'),panel:$('#klc-month-panel'),modes:['month'],getMaxDate:()=>null,
 getSelection:()=>klcState.monitorMonth?{mode:'month',year:Number(klcState.monitorMonth.slice(0,4)),value:Number(klcState.monitorMonth.slice(5,7))}:null,
 onApply:selection=>{klcState.monitorMonth=String(selection.year).padStart(4,'0')+'-'+String(selection.value).padStart(2,'0');klcState.page=1;klcRender()}
});
$('#klc-reset').onclick=()=>{Object.assign(klcState,{query:'',shopQuery:'',monitorMonth:'',page:1});klcRender()};
$('#klc-import').onclick=klcOpenImport;$('#klc-template').onclick=klcDownloadTemplate;
$('#klc-body').onclick=e=>{
 const remove=e.target.closest('[data-klc-remove]'),key=remove?.dataset.klcRemove,row=klcRows().find(r=>klcKey(r)===key);if(!row)return;
 klcRemoveDialog.innerHTML=klcDialogContent('移除核心链接？',`<p>${esc(row.name||'--')}</p><p>ID：${esc(row.linkId)}</p>`,'<button class="klc-button danger" id="klc-remove-confirm">移除</button>');
 const revision=klcStore.revision;$('#klc-remove-confirm').onclick=()=>{try{klcCommit([{type:'remove',row}],revision);klcRemoveDialog.close();klcAfterChange()}catch(error){klcError(klcRemoveDialog,error)}};klcRemoveDialog.showModal();
};
for(const dialog of [klcImportDialog,klcRemoveDialog])dialog.addEventListener('click',e=>{if(e.target.closest('[data-klc-close]'))dialog.close()});
window.addEventListener('storage',e=>{if(e.key===KLC_STORAGE){klcStore=klcLoad();klcAfterChange()}});
