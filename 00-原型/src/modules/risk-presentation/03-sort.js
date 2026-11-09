// 表头排序使用原始数值，先排全量再分页；取消排序即保留业务规则顺序。
function rpSortCycle(state,key,defaultSort=null){
 if(state.key!==key){state.key=key;state.direction='desc'}
 else if(state.direction==='desc')state.direction='asc';
 else if(defaultSort?.key===key)state.direction='desc';
 else Object.assign(state,defaultSort||{key:'',direction:''})
}
function rpSortHeader(key,label,state,kind,defaultSort=null){
 if(['core','type','attribute','causes','mainSpu','category','season','productType'].includes(key))return label;
 const active=state.key===key,action=!active?'降序':state.direction==='desc'?'升序':defaultSort?.key===key?'降序':'恢复榜单排序';
 const note=key==='fine'||key==='frozen'?'按金额排序；':key==='score'&&kind===1?'不同平台分组，同平台内按评分排序；':'';
 return '<button type="button" class="rp-sort-header" data-rp-sort="'+key+'" data-direction="'+(active?state.direction:'')+'" title="'+note+'点击'+action+'" aria-label="'+esc(label)+'：'+note+action+'">'+esc(label)+'<span class="rp-sort-arrows" aria-hidden="true"></span></button>'+netSalesHelp(key)+(kind===0&&key==='contact'?rpQualityRatesHelp():'');
}
function rpSortRows(rows,state,valueOf,groupOf=()=>null){
 if(!state.key)return rows;
 const groups=new Map();
 return rows.map((row,index)=>{
  const group=groupOf(row);if(!groups.has(group))groups.set(group,groups.size);
  return {row,index,value:valueOf(row,state.key),group:groups.get(group)};
 }).sort((a,b)=>{
  const av=Number.isFinite(a.value),bv=Number.isFinite(b.value);
  if(av!==bv)return av?-1:1; // 缺失与不适用始终置后，不能视为0。
  if(!av)return a.index-b.index;
  return a.group-b.group||(state.direction==='asc'?a.value-b.value:b.value-a.value)||a.index-b.index;
 }).map(entry=>entry.row);
}
function rpGroupSortKeys(k){return ['count','warehouse','factory','undelivered','totalUnits',k===3?'goodsValueCents':'staleValueCents','staleUnits']}
function rpApplySortAria(host,state){
 for(const button of host.querySelectorAll('[data-rp-sort]'))button.closest('th').setAttribute('aria-sort',state.key!==button.dataset.rpSort?'none':state.direction==='asc'?'ascending':'descending');
}
