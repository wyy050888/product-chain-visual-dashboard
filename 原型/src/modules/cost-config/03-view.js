const cecRoute='#system-cost-efficiency';
const cecOptions=(values,current)=>values.map(([value,label])=>`<option value="${esc(String(value))}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`).join('');
const cecYears=()=>dashboardYears(4).map(y=>[y,y+'年']);
const CEC_PAGE_SIZE=DRAWER_PAGE_SIZE;
smRegisterPage({route:cecRoute,id:'cec-page',title:'降本增效配置',group:'目标管理',menuOrder:20,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">降本增效配置</h2><div id="cec-time" class="module-header-time ui-business-filters"></div></header><section class="lt-panel cec-panel"><div class="cec-filters ui-business-filters"><label class="ui-search-field"><input id="cec-query" type="search" aria-label="搜索降本指标" placeholder="搜索降本指标" maxlength="80"></label><label><span>责任部门</span><select id="cec-department" aria-label="筛选责任部门"></select></label><button class="link" id="cec-reset" type="button">重置</button></div><div class="cec-action-bar"><div class="cec-actions"><button class="cec-button primary" id="cec-new" type="button"><span aria-hidden="true">＋</span> 新增降本指标</button><button class="cec-button" id="cec-import" type="button">导入</button><button class="cec-button" id="cec-template" type="button">下载模板</button></div></div><div class="cec-table-scroll"><table class="cec-table"><thead id="cec-head"></thead><tbody id="cec-total" aria-label="合计"></tbody><tbody id="cec-body"></tbody></table></div><div id="cec-pagination"></div></section>`,onShow(){cecRenderPage()}});
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
const cecDiscard=document.createElement('dialog');cecDiscard.className='cec-dialog cec-discard';cecDiscard.innerHTML='<header><h2>放弃本次修改？</h2></header><div class="cec-discard-body">当前填写内容尚未保存</div><footer><button class="cec-button" data-cec-continue>继续填写</button><button class="cec-button primary" data-cec-discard>放弃修改</button></footer>';document.body.append(cecDiscard);
function cecRenderPage(){
 cecRenderPeriod();$('#cec-department').innerHTML=cecOptions([['','全部'],...ccDepartments.map(d=>[d.id,d.name])],cecState.department);$('#cec-query').value=cecState.query;
 decorateFilterFields($('#cec-page .cec-filters'));cecRenderTable();
}
function cecRenderTable(){
 const rows=cecFiltered(),pages=Math.max(1,Math.ceil(rows.length/CEC_PAGE_SIZE));cecState.page=Math.min(cecState.page,pages);
 const prefix={month:'月度',quarter:'季度',year:'年度'}[cecState.mode];
 $('#cec-head').innerHTML='<tr>'+['责任部门','降本指标',prefix+'目标金额（元）',prefix+'实际降本金额（元）','备注','更新时间','操作'].map(t=>`<th>${t}</th>`).join('')+'</tr>';
 $('#cec-body').innerHTML=rows.slice((cecState.page-1)*CEC_PAGE_SIZE,cecState.page*CEC_PAGE_SIZE).map(p=>{const cell=cecSummaryCell(p.id);return `<tr data-cec-project="${esc(p.id)}"><td>${esc(cecDepartment(p.department).name)}</td><td><strong>${esc(p.metric)}</strong></td><td class="cec-number">${cecMoney(cell.targetCents)}</td><td class="cec-number">${cecMoney(cell.actualCents)}</td><td class="cec-note">${esc(cell.note||'—')}</td><td class="cec-updated">${esc(cell.updatedAt||cecStore.metrics[p.id]?.updatedAt||'—')}</td><td class="cec-row-actions"><button type="button" data-cec-view="${esc(p.id)}">查看</button><button type="button" data-cec-edit="${esc(p.id)}">编辑</button></td></tr>`}).join('')||'<tr><td colspan="7" class="cec-empty">暂无符合条件的指标</td></tr>';
 const sum=key=>{const values=rows.map(p=>cecSummaryCell(p.id)[key]).filter(v=>v!==null);return values.length?values.reduce((a,b)=>a+b,0):null};
 $('#cec-total').innerHTML=rows.length?`<tr><td colspan="2">合计</td><td class="cec-number">${cecMoney(sum('targetCents'))}</td><td class="cec-number">${cecMoney(sum('actualCents'))}</td><td colspan="3"></td></tr>`:'';
 const host=$('#cec-pagination');host.innerHTML=listPager(rows.length,cecState.page,CEC_PAGE_SIZE);bindListPager(host,page=>{cecState.page=page;cecRenderTable()});
}
let cecDraft=null,cecDraftInitial='',cecBatch=null,cecReadToken=0;
function cecDraftFor(item,readonly,year,isNew=false){
 cecDraft={id:item.id,department:item.department,metricIndex:item.metricIndex,metric:item.metric,year,months:{},readonly,isNew};
 cecLoadDraftYear(year);cecDraftInitial=JSON.stringify(cecDraft);cecPaintEditor();
}
function cecOpenEditor(id='',readonly=false,isNew=false){
 const item=isNew?{id:'',department:cecState.department||ccDepartments[0].id,metricIndex:null,metric:''}:ccItems.find(p=>p.id===id);
 if(!item)return;
 cecDraftFor(item,readonly,cecState.year,isNew);cecDialog.showModal();
 requestAnimationFrame(()=>cecDialog.querySelector(`[data-cec-month-row="${cecState.month}"]`)?.scrollIntoView({block:'center',behavior:'instant'}));
}
function cecLoadDraftYear(year){for(let m=1;m<=12;m++){const key=cecMonth(year,m);if(!cecDraft.months[key]){const value=cecCell(cecDraft.id,key);cecDraft.months[key]={target:cecInput(value.targetCents),actual:cecInput(value.actualCents),note:value.note}}}}
function cecPaintEditor(){
 const d=cecDraft,disabled=d.readonly?'disabled':'';
 const metricField=`<input name="metric" aria-label="降本指标" maxlength="80" value="${esc(d.metric)}" placeholder="请输入降本指标" ${disabled}>`;
 cecDialog.innerHTML=`<header><h2 id="cec-editor-title">${d.readonly?'降本明细':d.isNew?'新增降本指标':'编辑降本数据'}</h2><button type="button" class="cec-close" data-cec-close aria-label="关闭">×</button></header><div class="cec-editor-body"><div class="cec-project-fields"><label>责任部门 <em>*</em><select name="department" ${d.readonly||!d.isNew?'disabled':''}>${cecOptions(ccDepartments.map(v=>[v.id,v.name]),d.department)}</select></label><label>降本指标 <em>*</em>${metricField}</label></div><div class="cec-month-heading"><h3>月度降本</h3><div><select id="cec-editor-year" aria-label="降本年份">${cecOptions(cecYears(),d.year)}</select></div></div><div class="cec-month-scroll"><table class="cec-table cec-month-table"><thead><tr><th>月份</th><th>目标金额（元）</th><th>实际降本金额（元）</th><th>备注</th></tr></thead><tbody>${Array.from({length:12},(_,i)=>{const month=cecMonth(d.year,i+1),v=d.months[month];return `<tr data-cec-month-row="${i+1}" class="${i+1===cecState.month?'cec-selected-month':''}"><td>${i+1}月</td>${[['target','目标金额'],['actual','实际降本金额']].map(([field,label])=>`<td><input type="text" inputmode="decimal" data-cec-month="${month}" data-cec-field="${field}" aria-label="${i+1}月${label}" value="${esc(v[field])}" placeholder="--" ${disabled}></td>`).join('')}<td><input data-cec-month="${month}" data-cec-field="note" aria-label="${i+1}月备注" value="${esc(v.note)}" maxlength="200" placeholder="请输入" ${disabled}></td></tr>`}).join('')}</tbody><tfoot><tr><td>年度合计</td><td id="cec-year-target" class="cec-number"></td><td id="cec-year-actual" class="cec-number"></td><td></td></tr></tfoot></table></div></div><footer><p id="cec-editor-error" role="alert"></p><div><button class="cec-button" data-cec-close>${d.readonly?'关闭':'取消'}</button>${d.readonly?`<button class="cec-button primary" id="cec-start-edit">编辑</button>`:'<button class="cec-button primary" id="cec-save">保存</button>'}</div></footer>`;cecDraftTotals();
}
function cecDraftTotals(){for(const field of ['target','actual']){const values=Object.entries(cecDraft.months).filter(([m])=>m.startsWith(cecDraft.year+'-')).map(([,v])=>{try{return cecAmount(v[field],field==='target')}catch(_){return null}}).filter(v=>v!==null);$('#cec-year-'+field).textContent=cecMoney(values.length?values.reduce((a,b)=>a+b,0):null)}}
