// 覆盖年份取业务日期，不单独维护名单年度；缺日期的历史记录只在全部年份中展示。
const ssiCurrentYear=()=>dashboardToday().slice(0,4);
const ssiYear=row=>{const date=row[(row.tier||'primary')==='secondary'?'admitted':'cooperation'];return ssiValidDate(date)?date.slice(0,4):''};
const ssiDateYear=date=>ssiValidDate(date)?date.slice(0,4):'';
function ssiYearCovered(tier,year,store=ssiStore){return store.replacedTiers.includes(tier)||!!year&&(store.replacedYears?.[tier]||[]).includes(year)}
function ssiRemoved(row,keys=ssiStore.removed||[]){return keys.includes(ssiKey(row))||keys.includes(ssiRelationshipKey(row))}
function ssiAllRows(tier=ssiState.tier){
 const imported=ssiStore.rows.filter(row=>row.tier===tier),keys=new Set(imported.map(ssiKey));
 return [...imported,...ssiSeedRows[tier].filter(row=>!ssiYearCovered(tier,ssiYear(row))&&!keys.has(ssiKey(row)))].filter(row=>!ssiRemoved(row));
}
function ssiYearOptions(){
 const values=new Set([ssiCurrentYear(),...dashboardYears(1).map(String),...ssiAllRows().map(ssiYear).filter(Boolean)]);
 return [...values].sort().reverse();
}
function ssiSyncYear(){
 const select=$('#ssi-year'),year=ssiViewState().year;
 const markup='<option value="all">全部年份</option>'+ssiYearOptions().map(value=>'<option value="'+value+'">'+value+'年</option>').join('');
 if(select.innerHTML!==markup)select.innerHTML=markup;select.value=year;
 select.setAttribute('aria-label',ssiState.tier==='primary'?'合作年份':'准入年份');select.uiYearControl?.sync();
}

// 旧版无年份移除键转成其他年份的精确键，重导某年不能恢复另一年已移除关系。
function ssiImportedRemovals(rows,years,tier){
 const removed=new Set(ssiStore.removed||[]),oldRows=[...ssiStore.rows,...ssiSeedRows[tier]];
 for(const row of rows){const legacy=ssiRelationshipKey(row);
  if(removed.has(legacy)){for(const old of oldRows)if(ssiRelationshipKey(old)===legacy&&!years.has(ssiYear(old)))removed.add(ssiKey(old));removed.delete(legacy)}
  removed.delete(ssiKey(row));
 }
 return [...removed];
}
