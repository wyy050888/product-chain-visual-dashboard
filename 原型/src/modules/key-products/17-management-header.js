// 明细独立期间：临时借用现有关键产品模型计算，始终恢复外层期间。
function kpmManagementContext(key,tab,period){return drawerWithPeriod(period,()=>{
 const all=kpmFilterRows(kpmRows(),true,true,{...kpmFilters,price:'all',min:'',max:''}),group=kpmManagementGroups(all,tab).find(g=>g.key===key),ids=new Set(kpmManagementIds(all,key,tab));
 const rows=all.filter(p=>ids.has(p.spuId));
 return {tab,group,rows,all,range:{...upWindow()},comparison:all[0]?.assessment,cycles:kpmManagementCycles(rows),totalGsv:all.reduce((n,p)=>n+p.facts.gsvCents,0)};
},'matrix');}
function kpmManagementDateText(context){
 const {tab,range,comparison}=context;
 const fields=tab==='changes'&&comparison?[
  ['current','本期',kpmGradeRange(comparison.current)],['previous','上期',kpmGradeRange(comparison.previous)]
 ]:tab==='structure'?[
  ['selected','统计期间',range.start+' — '+range.end],['grade','分级期间',shiftDate(range.end,-29)+' — '+range.end]
 ]:[['cutoff','数据截至',range.end]];
 return fields.map(([key,label,value])=>`<span data-up-basic data-kpm-period="${key}">${label} <time>${esc(value)}</time></span>`).join('');
}
function kpmMountManagementHeader({tab,key,period,context,onChange}){
 const host=$('#dialogsub');host.innerHTML='<span class="kpm-management-heading"><span class="kpm-management-heading-status"></span><span class="kpm-management-heading-count" data-up-basic></span><span class="kpm-management-dates"></span><span class="kpm-management-period-picker"></span></span>';
 const status=host.querySelector('.kpm-management-heading-status'),count=host.querySelector('.kpm-management-heading-count'),dates=host.querySelector('.kpm-management-dates');
 drawerMountPeriod(host.querySelector('.kpm-management-period-picker'),period,onChange,'kpm-management-date-trigger','matrix');
 const update=data=>{status.innerHTML=key.startsWith('grade-')?'':kpmManagementLamp(data.group?.tone||'');count.textContent=data.rows.length+'个';dates.innerHTML=kpmManagementDateText(data)};
 update(context);return {update};
}
function kpmOpenManagementProduct(spuId,period,tab='operating'){
 const range=upWindow(period);kpmSuspendChartZoom();kpmHidePointTooltip();
 upOpenDetail({spuId,...range,period:{...period},module:'matrix',platform:kpmBusinessPlatforms(),tab});
}
