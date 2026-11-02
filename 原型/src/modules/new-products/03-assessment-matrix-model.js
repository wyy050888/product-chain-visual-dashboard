// 抽屉内一次读取四季，点击汇总仅筛选已有名单；年度仍独立查询、独立考核。
function nspAssessmentChain(product){return filterCatalog.normalizeChain(chains[product.chain]||product.chain)||'未归类'}
function nspAssessmentChainRows(data,chain='all'){return chain==='all'?data.rows:data.rows.filter(product=>nspAssessmentChain(product)===chain)}
function nspAssessmentScopedData(data,chain='all'){
 const rows=nspAssessmentChainRows(data,chain);
 return {...data,rows,summary:nspSuccessSummary(rows,data.assessment)};
}
// 明细搜索只收紧当前链群名单，不重算上方季度/年度汇总。
function nspAssessmentSearchData(data,query=''){
 const text=query.trim().toLocaleLowerCase();if(!text)return data;
 const rows=data.rows.filter(product=>[product.name,product.spuCode,product.model].some(value=>String(value??'').toLocaleLowerCase().includes(text)));
 return {...data,rows,summary:nspSuccessSummary(rows,data.assessment)};
}
function nspAssessmentMatrix(year,annual,cutoff,filters){
 const limit=cutoff&&cutoff<DATA_CUTOFF?cutoff:DATA_CUTOFF;
 const periods=(annual?[null]:[1,2,3,4]).map(quarter=>{
  const period={mode:annual?'year':'quarter',year,value:quarter||1};
  const start=year+'-'+String(annual?1:(quarter-1)*3+1).padStart(2,'0')+'-01';
  const available=start<=limit,data=available?nspAssessmentData(period,limit,filters):null;
  const end=annual?year+'-12-31':iso(new Date(Date.UTC(year,quarter*3,0)));
  return {quarter,available,ongoing:available&&end>limit,data};
 });
 const labels=[...filterCatalog.chains];
 if(periods.some(p=>p.data?.rows.some(row=>nspAssessmentChain(row)==='未归类')))labels.push('未归类');
 const groups=[{key:'all',label:'公司汇总'},...labels.map(label=>({key:label,label}))].map(group=>({...group,
  summaries:periods.map(period=>period.data?nspSuccessSummary(nspAssessmentChainRows(period.data,group.key),period.data.assessment):null)}));
 return {year,annual,periods,groups};
}
function nspAssessmentMatrixSnapshot(matrix){
 return {year:matrix.year,annual:matrix.annual,groups:matrix.groups,periods:matrix.periods.map(period=>({quarter:period.quarter,available:period.available,ongoing:period.ongoing,
  summary:period.data?.summary||null,members:period.data?.rows.map(row=>({spuId:row.spuId,chain:nspAssessmentChain(row),developmentType:row.developmentType||null,success:row.successAssessment.success}))||[]}))};
}
