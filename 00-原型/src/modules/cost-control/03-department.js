function ccPeriodControls(period){
 const limit=dashboardPeriodLimit(period);
 return `<div class="cc-period period-picker"><div class="period-segment" role="group" aria-label="降本时间粒度">${[['month','月'],['quarter','季'],['year','年']].map(([mode,label])=>`<button type="button" data-cc-mode="${mode}" aria-pressed="${period.mode===mode}">${label}</button>`).join('')}</div><select data-cc-year aria-label="降本年份">${dashboardYears(0,period.year).reverse().map(year=>`<option value="${year}" ${year===period.year?'selected':''}>${year} 年</option>`).join('')}</select>${period.mode==='year'?'':`<select data-cc-value aria-label="降本${period.mode==='month'?'月份':'季度'}">${Array.from({length:limit},(_,i)=>`<option value="${i+1}" ${i+1===period.value?'selected':''}>${period.mode==='month'?(i+1)+' 月':'Q'+(i+1)}</option>`).join('')}</select>`}<span class="period-range">${bounds(period).start} — ${bounds(period).cutoff}</span></div>`;
}
function ccBindPeriod(host,context,paint){
 const change=(field,value)=>{
  const p=context.period;
  if(field==='mode'){const month=p.mode==='month'?p.value:p.mode==='quarter'?p.value*3:p.year===+dashboardToday().slice(0,4)?+dashboardToday().slice(5,7):12;p.mode=value;p.value=value==='month'?month:value==='quarter'?Math.ceil(month/3):1}else p[field]=+value;
  normalizePeriod(p);paint();
 };
 host.onclick=event=>{const button=event.target.closest('[data-cc-mode]');if(button)change('mode',button.dataset.ccMode)};
 host.onchange=event=>{if(event.target.matches('[data-cc-year]'))change('year',event.target.value);if(event.target.matches('[data-cc-value]'))change('value',event.target.value)};
}
function ccMountPeriod(context,paint){const host=document.createElement('span');host.className='cc-period-host';host.innerHTML=ccPeriodControls(context.period);$('#dialogsub').replaceChildren(host);ccBindPeriod(host,context,paint)}
function ccOpenDepartment(id){ccOpenGroup('department',id)}
function ccOpenCategory(id){ccOpenGroup('category',id)}
function ccOpenGroup(kind,id){
 const groups=kind==='category'?ccCategoryGroups():ccDepartments;
 if(!groups.some(group=>group.id===id))return;
 const context={period:{...periodFor('cost')},group:id};
 openModal('降本明细',`<article class="cc-drawer" data-cc-drawer="${kind}" data-cc-group="${esc(id)}" ${kind==='department'?`data-cc-department="${esc(id)}"`:''}><div class="cc-department-table cc-table-scroll"></div></article>`);
 const root=$('.cc-drawer');
 const paint=()=>{
  const period=context.period,metrics=kind==='category'?(ccCategoryGroups().find(group=>group.id===context.group)?.metrics||[]):ccMetrics.filter(metric=>metric.department===context.group);
  root.dataset.ccGroup=context.group;if(kind==='department')root.dataset.ccDepartment=context.group;
  const byCategory=kind==='category',byProductType=byCategory&&context.group==='product';
  let rows,extraSummary=null;
  if(byProductType){
   const {groups,pending}=ccProductCostGroups(metrics);
   rows=groups.map(({name,metrics,includeRow})=>({
    id:name,name,
    subtitle:ccDepartments.filter(dept=>metrics.some(metric=>metric.department===dept.id)).map(dept=>dept.name).join('、'),
    values:ccSummary(metrics,period,true,includeRow)
   }));
   const values=ccSummary(pending.metrics,period,true,pending.includeRow);
   if(Object.values(values).some(value=>Number.isFinite(value.actual)))extraSummary={label:'历史金额（类目待确认）',values};
  }else{
   rows=metrics.map(metric=>({id:metric.id,name:metric.name,subtitle:byCategory?ccDepartments.find(dept=>dept.id===metric.department)?.name:ccCategoryName(metric.category),values:ccSummary([metric],period,true)}));
  }
  root.querySelector('.cc-department-table').innerHTML=ccTable(period,rows,{first:byProductType?'二级类目':'降本指标',actualOnly:true,contextLabel:byCategory?'责任部门':'降本分类',summary:ccSummary(metrics,period,true),extraSummary});
  ccMountPeriod(context,paint);drawerQueueRefresh();
 };
 root.ccSelect=key=>{context.group=key;paint();$('#dialogbody').scrollTop=0};paint();
}
const ccPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.cc-drawer:is([data-cc-drawer="department"],[data-cc-drawer="category"])');if(!root)return ccPreviousDrawerProfile(body,title);
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),
  tabs:(root.dataset.ccDrawer==='category'?ccCategoryGroups():ccDepartments).map(group=>({key:group.id,label:group.name})),
  activeKey:root.dataset.ccGroup,onSelect:(key,focus)=>{root.ccSelect(key);if(focus)queueMicrotask(()=>drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true}))}};
};
