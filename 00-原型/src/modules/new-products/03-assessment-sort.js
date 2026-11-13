// 考核排序独立于新品主表，使用所选考核期间的原始指标；空值始终置后。
const nspAssessmentSortFields={
 quarter:{label:'上市季度',value:p=>uiPeriodValidDate(p.actualLaunch)?Number(p.actualLaunch.slice(0,4))*4+Math.ceil(Number(p.actualLaunch.slice(5,7))/3):null},
 gsv:{label:'GSV',value:p=>p.successAssessment.facts.gsvCents},
 profit:{label:'利润率',value:p=>p.successAssessment.facts.profitRate},
 returns:{label:'总退',value:p=>p.successAssessment.facts.returnRate},
 launch:{label:'上市日期',value:p=>uiPeriodValidDate(p.actualLaunch)?Date.parse(p.actualLaunch):null}
};
function nspAssessmentSortRows(rows,sort){return rpSortRows(rows,sort,(row,key)=>nspAssessmentSortFields[key].value(row))}
function nspAssessmentTableHeaders(sort){
 const keys={'上市季度':'quarter','GSV':'gsv','利润率':'profit','总退':'returns','上市日期':'launch'};
 return ['SPU系列','产品简称','上市季度','GSV','利润率','总退','考核结果','上市日期','项目类型','操作'].map(label=>{
  const key=keys[label];if(!key)return label;
  const direction=sort.key===key?sort.direction:'',next=direction==='desc'?'升序':'降序';
  return '<button type="button" class="rp-sort-header" data-nsp-assess-sort="'+key+'" data-direction="'+direction+'" aria-label="'+label+'：点击'+next+'">'+label+'<span class="rp-sort-arrows" aria-hidden="true"></span></button>';
 });
}
function nspAssessmentSortAria(host,sort){
 for(const button of host.querySelectorAll('[data-nsp-assess-sort]')){
  const key=button.dataset.nspAssessSort,direction=sort.key===key?sort.direction:'',aria=direction==='asc'?'ascending':direction==='desc'?'descending':'none',cell=button.closest('th');
  // 仅关闭该表头的指标说明，保留标题、排序及可访问名称。
  if(key==='gsv'){cell.setAttribute('data-metric-help-disabled','');cell.querySelectorAll('.metric-help').forEach(help=>help.remove())}
  if(button.dataset.direction!==direction)button.dataset.direction=direction;
  const label=nspAssessmentSortFields[key].label+'：点击'+(direction==='desc'?'升序':'降序');if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
  if(cell.getAttribute('aria-sort')!==aria)cell.setAttribute('aria-sort',aria);
 }
}
