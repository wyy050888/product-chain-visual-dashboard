const cecRoute='#system-cost-efficiency';
const cecOptions=(values,current)=>values.map(([value,label])=>`<option value="${esc(String(value))}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`).join('');
const cecYears=()=>dashboardYears(4).map(y=>[y,y+'年']);
function cecPageSize(){return listPageSize('cec-pagination')}
smRegisterPage({route:cecRoute,id:'cec-page',title:'降本增效',group:'目标管理',menuOrder:20,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">降本增效</h2><div class="cec-tabs" role="tablist" aria-label="降本数据"><button id="cec-tab-actual" type="button" role="tab" data-cec-tab="actual" aria-selected="true" aria-controls="cec-data-panel">实际值</button><button id="cec-tab-target" type="button" role="tab" data-cec-tab="target" aria-selected="false" aria-controls="cec-data-panel" tabindex="-1">目标值</button></div><div id="cec-time" class="module-header-time ui-business-filters"></div></header><section id="cec-data-panel" class="lt-panel cec-panel" role="tabpanel" aria-labelledby="cec-tab-actual"><div id="cec-departments" class="cec-department-tabs" role="tablist" aria-label="责任部门"></div><div class="cec-filters ui-business-filters"><label class="ui-search-field"><input id="cec-query" type="search" aria-label="搜索部门或降本指标" placeholder="搜索降本指标" maxlength="80"></label><button class="link" id="cec-reset" type="button">重置</button></div><div class="cec-action-bar"><div class="cec-actions">${smDataAction('import','导入','id="cec-import"')}${smDataAction('download','下载模板','id="cec-template"')}<button id="cec-history" type="button" class="link" data-ui-import-history="降本实际值">导入记录</button></div></div><div id="cec-table-content" class="cec-table-scroll" role="tabpanel" aria-label="责任部门数据"><table class="cec-table cec-combined-table"><thead id="cec-head"></thead><tbody id="cec-total" aria-label="合计"></tbody><tbody id="cec-body"></tbody></table></div><div id="cec-pagination"></div></section>`,onShow(){cecRenderPage()}});
function cecRenderPeriod(){
 const previous=localPeriods.cost;localPeriods.cost=cecPeriod();let html;
 try{html=periodControls('cost')}finally{if(previous)localPeriods.cost=previous;else delete localPeriods.cost}
 const host=$('#cec-time');host.innerHTML=html.replaceAll('data-time-','data-cec-time-');host.querySelector('.follow-time')?.remove();
 const year=host.querySelector('[data-cec-time-year]');year.innerHTML=cecOptions(cecYears(),cecState.year);year.setAttribute('aria-label','配置年份');
 host.querySelector('[data-cec-time-value]')?.remove();
 host.querySelector('.period-segment').setAttribute('aria-label','配置时间粒度');
}
const cecImportDialog=document.createElement('dialog');cecImportDialog.id='cec-import-dialog';cecImportDialog.className='cec-dialog cec-import-dialog';cecImportDialog.setAttribute('aria-labelledby','cec-import-title');document.body.append(cecImportDialog);
function cecRenderPage(){
 cecRenderPeriod();$('#cec-query').value=cecState.query;
 decorateFilterFields($('#cec-page .cec-filters'));cecRenderTable();
}
function cecRenderTable(){cecRenderSplitTable()}
let cecBatch=null,cecReadToken=0;
