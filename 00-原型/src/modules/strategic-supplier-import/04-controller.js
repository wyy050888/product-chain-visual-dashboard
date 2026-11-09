ssiDialog.addEventListener('cancel',event=>{event.preventDefault();ssiCloseImport()});
ssiDialog.addEventListener('click',event=>{if(event.target.closest('[data-ssi-close]'))ssiCloseImport();const template=event.target.closest('[data-ssi-template]');if(template)ssiTemplate(template.dataset.ssiTemplate)});
$('#ssi-page').addEventListener('input',event=>{if(event.target.id==='ssi-query'){ssiViewState().query=event.target.value;ssiViewState().page=1;ssiRenderTable()}});
$('#ssi-page').addEventListener('change',event=>{const filter={'ssi-brand':'brand','ssi-material':'material'}[event.target.id];if(filter){ssiViewState()[filter]=pfControlValue(event.target);ssiViewState().page=1;ssiRenderTable()}if(event.target.id==='ssi-year'){ssiViewState().year=event.target.value;ssiViewState().page=1;ssiRenderTable()}});
$('#ssi-page').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.ssiTier){ssiState.tier=button.dataset.ssiTier;ssiRenderPage()}
 if(button.dataset.rpSort&&ssiDateSortKeys.includes(button.dataset.rpSort)){rpSortCycle(ssiViewState().sort,button.dataset.rpSort,ssiDefaultSort());ssiViewState().page=1;ssiRenderTable();$('#ssi-head [data-rp-sort="'+button.dataset.rpSort+'"]').focus({preventScroll:true})}
 if(button.id==='ssi-import')ssiOpenImport();if(button.id==='ssi-template')ssiTemplate();
 if(button.id==='ssi-export')ssiExport();
 if(button.id==='ssi-history')uiImportHistory(ssiTierLabels[ssiState.tier]);
 if(button.id==='ssi-reset'){Object.assign(ssiViewState(),{year:ssiCurrentYear(),query:'',category:'all',material:'all',brand:'all',page:1,sort:ssiDefaultSort()});ssiRenderPage()}
});
$('#suppliergrid').addEventListener('click',event=>{const button=event.target.closest('[data-scp-import-strategic]');if(button){ssiState.tier=button.dataset.scpImportStrategic||'primary';smNavigate(ssiRoute)}});
window.addEventListener('storage',event=>{if(event.key!==SSI_STORAGE&&event.key!==null)return;ssiStore=ssiLoad();ssiApply();scpRepaint();if(smActiveRoute===ssiRoute)ssiRenderPage()});
