const cecRoute='#system-cost-efficiency';
const cecOptions=(values,current)=>values.map(([value,label])=>`<option value="${esc(String(value))}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`).join('');
const cecYears=()=>dashboardYears(4).map(y=>[y,y+'年']);
function cecPageSize(){return listPageSize('cec-pagination')}
smRegisterPage({route:cecRoute,id:'cec-page',title:'降本增效目标',group:'目标管理',menuOrder:20,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">降本增效目标</h2><div id="cec-time" class="module-header-time ui-business-filters"></div></header><section class="lt-panel cec-panel"><div class="cec-filters ui-business-filters"><label class="ui-search-field"><input id="cec-query" type="search" aria-label="搜索部门或降本指标" placeholder="搜索降本指标" maxlength="80"></label><label><span>责任部门</span><select id="cec-department" aria-label="筛选责任部门"></select></label><button class="link" id="cec-reset" type="button">重置</button></div><div class="cec-action-bar"><div class="cec-actions">${smDataAction('import','导入','id="cec-import"')}${smDataAction('download','下载模板','id="cec-template"')}</div><div class="cec-tree-tools"><button type="button" class="cec-text-button" data-cec-expand-all="true">展开全部</button><button type="button" class="cec-text-button" data-cec-expand-all="false">收起全部</button></div></div><div class="cec-table-scroll"><table class="cec-table cec-combined-table"><thead id="cec-head"></thead><tbody id="cec-total" aria-label="合计"></tbody><tbody id="cec-body"></tbody></table></div><div id="cec-pagination"></div></section>`,onShow(){cecRenderPage()}});
function cecRenderPeriod(){
 const previous=localPeriods.cost;localPeriods.cost=cecPeriod();let html;
 try{html=periodControls('cost')}finally{if(previous)localPeriods.cost=previous;else delete localPeriods.cost}
 const host=$('#cec-time');host.innerHTML=html.replaceAll('data-time-','data-cec-time-');host.querySelector('.follow-time')?.remove();
 const year=host.querySelector('[data-cec-time-year]');year.innerHTML=cecOptions(cecYears(),cecState.year);year.setAttribute('aria-label','配置年份');
 const value=host.querySelector('[data-cec-time-value]');if(value){const quarter=cecState.mode==='quarter';value.innerHTML=cecOptions(Array.from({length:quarter?4:12},(_,i)=>[i+1,quarter?'Q'+(i+1):(i+1)+' 月']),quarter?Math.ceil(cecState.month/3):cecState.month);value.setAttribute('aria-label',quarter?'配置季度':'配置月份')}
 host.querySelector('.period-segment').setAttribute('aria-label','配置时间粒度');
}
const cecDialog=document.createElement('dialog');cecDialog.id='cec-editor';cecDialog.className='cec-dialog cec-editor';cecDialog.setAttribute('aria-labelledby','cec-editor-title');document.body.append(cecDialog);
const cecImportDialog=document.createElement('dialog');cecImportDialog.id='cec-import-dialog';cecImportDialog.className='cec-dialog cec-import-dialog';cecImportDialog.setAttribute('aria-labelledby','cec-import-title');document.body.append(cecImportDialog);
function cecRenderPage(){
 cecRenderPeriod();$('#cec-department').innerHTML=cecOptions([['','全部'],...ccDepartments.map(d=>[d.id,d.name])],cecState.department);$('#cec-query').value=cecState.query;
 decorateFilterFields($('#cec-page .cec-filters'));cecRenderTable();
}
function cecRenderTable(){cecRenderCombinedTable()}
let cecDraft=null,cecBatch=null,cecReadToken=0;
// 明细仅供查看；目标与实际统一通过导入维护。
function cecOpenEditor(id){
 const item=ccItems.find(row=>row.id===id);if(!item)return;
 cecDraft={id:item.id,department:item.department,category:item.category||'',metric:item.metric,year:cecState.year,months:{}};
 cecLoadDraftYear(cecDraft.year);cecPaintEditor();cecDialog.showModal();
 requestAnimationFrame(()=>cecDialog.querySelector(`[data-cec-month-row="${cecState.month}"]`)?.scrollIntoView({block:'center',behavior:'instant'}));
}
function cecLoadDraftYear(year){for(let m=1;m<=12;m++){const key=cecMonth(year,m);if(!cecDraft.months[key]){const value=cecCell(cecDraft.id,key);cecDraft.months[key]={actual:cecInput(value.actualCents)}}}}
function cecPaintEditor(){
 const d=cecDraft,disabled='disabled';
 const metricField=`<input name="metric" aria-label="降本指标" maxlength="80" value="${esc(d.metric)}" placeholder="请输入降本指标" ${disabled}>`;
 cecDialog.innerHTML=`<header><h2 id="cec-editor-title">降本明细</h2><button type="button" class="cec-close" data-cec-close aria-label="关闭">×</button></header><div class="cec-editor-body"><div class="cec-project-fields"><label><span class="ui-field-caption">责任部门 <em>*</em></span><select name="department" disabled>${cecOptions(ccDepartments.map(v=>[v.id,v.name]),d.department)}</select></label><label><span class="ui-field-caption">降本分类 <em>*</em></span><select name="category" aria-label="降本分类" ${disabled}>${cecOptions([['','请选择'],...ccCategories.map(c=>[c.id,c.name])],d.category)}</select></label><label><span class="ui-field-caption">降本指标 <em>*</em></span>${metricField}</label></div><div class="cec-month-heading"><h3>月度降本</h3><div><select id="cec-editor-year" aria-label="降本年份">${cecOptions(cecYears(),d.year)}</select></div></div><div class="cec-month-scroll"><table class="cec-table cec-month-table"><thead><tr><th>月份</th><th>实际降本金额（元）</th></tr></thead><tbody>${Array.from({length:12},(_,i)=>{const month=cecMonth(d.year,i+1),v=d.months[month];return `<tr data-cec-month-row="${i+1}" class="${i+1===cecState.month?'cec-selected-month':''}"><td>${i+1}月</td>${[['actual','实际降本金额']].map(([field,label])=>`<td><input type="text" inputmode="decimal" data-cec-month="${month}" data-cec-field="${field}" aria-label="${i+1}月${label}" value="${esc(v[field])}" placeholder="--" ${disabled}></td>`).join('')}</tr>`}).join('')}</tbody><tfoot><tr><td>年度合计</td><td id="cec-year-actual" class="cec-number"></td></tr></tfoot></table></div></div><footer><p id="cec-editor-error" role="alert"></p><div><button class="cec-button" data-cec-close>关闭</button></div></footer>`;cecDraftTotals();
}
function cecDraftTotals(){for(const field of ['actual']){const values=Object.entries(cecDraft.months).filter(([m])=>m.startsWith(cecDraft.year+'-')).map(([,v])=>{try{return cecAmount(v[field])}catch(_){return null}}).filter(v=>v!==null);$('#cec-year-'+field).textContent=cecMoney(values.length?values.reduce((a,b)=>a+b,0):null)}}
