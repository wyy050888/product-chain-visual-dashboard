function klcAfterChange(){klcRenderRows();rpHidePddLinks();withPeriod('risk',()=>renderRisks())}
function klcError(dialog,error){dialog.querySelector('.klc-error').textContent=error.message}
$('#klc-query').oninput=e=>{klcState.query=e.target.value;klcState.page=1;klcRenderRows()};
$('#klc-shop').onchange=e=>{klcState.shopId=e.target.value;klcState.page=1;klcRenderRows()};
$('#klc-reset').onclick=()=>{Object.assign(klcState,{query:'',shopId:'',page:1});klcRender()};
$('#klc-import').onclick=klcOpenImport;$('#klc-template').onclick=klcDownloadTemplate;
$('#klc-body').onclick=e=>{
 const edit=e.target.closest('[data-klc-edit]'),remove=e.target.closest('[data-klc-remove]'),key=edit?.dataset.klcEdit||remove?.dataset.klcRemove,row=klcRows().find(r=>klcKey(r)===key);if(!row)return;
 if(edit){klcOpenEditor(row);return}
 klcRemoveDialog.innerHTML=klcDialogContent('移除核心链接？',`<p>${esc(row.name||'--')}</p><p>ID：${esc(row.linkId)}</p>`,'<button class="klc-button danger" id="klc-remove-confirm">移除</button>');
 const revision=klcStore.revision;$('#klc-remove-confirm').onclick=()=>{try{klcCommit([{type:'remove',row}],revision);klcRemoveDialog.close();klcAfterChange()}catch(error){klcError(klcRemoveDialog,error)}};klcRemoveDialog.showModal();
};
for(const dialog of [klcEditor,klcImportDialog,klcRemoveDialog])dialog.addEventListener('click',e=>{if(e.target.closest('[data-klc-close]'))dialog.close()});
klcEditor.addEventListener('click',e=>{if(!e.target.closest('#klc-save'))return;try{
 const row={shopId:klcDraft.shopId,linkId:klcDraft.linkId,name:klcEditor.querySelector('[name=name]').value.trim()};
 klcCommit([{type:'edit',row}],klcDraft.revision);klcEditor.close();klcAfterChange();
}catch(error){klcError(klcEditor,error)}});
klcImportDialog.addEventListener('change',async e=>{
 if(e.target.id==='klc-overwrite'){$('#klc-confirm-import').disabled=!e.target.checked;return}
 if(e.target.id!=='klc-file')return;const token=++klcReadToken,file=e.target.files[0];klcBatch=null;$('#klc-confirm-import').disabled=true;
 klcImportDialog.querySelector('[data-klc-preview]').innerHTML='';klcImportDialog.querySelector('.klc-error').textContent='';if(!file)return;
 try{const table=await cwReadFile(file);if(token!==klcReadToken||!klcImportDialog.open)return;klcBatch=klcParseImport(table);klcImportPreview()}catch(error){if(token===klcReadToken)klcError(klcImportDialog,error)}
});
klcImportDialog.addEventListener('close',()=>{klcReadToken++});
klcImportDialog.addEventListener('click',e=>{
 if(e.target.closest('#klc-errors')&&klcBatch)downloadCsv(['行号','字段','错误'],klcBatch.errors.map(r=>[r.row,r.field,r.message]),'核心链接导入错误');
 if(e.target.closest('#klc-confirm-import')&&klcBatch&&!klcBatch.errors.length){try{if(klcBatch.rows.some(c=>c.type==='edit')&&!$('#klc-overwrite')?.checked)throw Error('请确认更新已有链接');klcCommit(klcBatch.rows,klcBatch.revision);klcImportDialog.close();klcAfterChange()}catch(error){klcError(klcImportDialog,error)}}
});
window.addEventListener('storage',e=>{if(e.key===KLC_STORAGE){klcStore=klcLoad();klcAfterChange()}});
