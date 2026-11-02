// 渠道表只改变展示顺序；主值始终来自同一期间台账，缺失值固定置后。
const upChannelColumns=[
 ['channel','平台',r=>r.channel],['gsvCents','GSV',r=>upMoney(r.gsvCents)],['sales','销量',r=>fmt(r.sales)],
 ['netSales','销量',r=>fmt(r.sales-r.returned)],['expenseCents','消耗',r=>upMoney(r.expenseCents)],
 ['feeRate','费率',r=>upPercent(r.feeRate)],['profitRate','利润率',r=>upPercent(r.profitRate)],
 ['returnRate','总退',r=>upPercent(r.returnRate)],['receivedRate','已收退',r=>upPercent(r.receivedRate)]
];
function upChannelSortValue(row,key){return key==='channel'?row.channel:key==='netSales'?row.sales-row.returned:row[key]}
function upSortedChannelRows(rows,sort){
 if(!sort?.key)return [...rows];
 return rows.map((row,index)=>({row,index,value:upChannelSortValue(row,sort.key)})).sort((a,b)=>{
  if(sort.key==='channel')return (sort.direction==='asc'?1:-1)*a.value.localeCompare(b.value,'zh-CN')||a.index-b.index;
  const av=Number.isFinite(a.value),bv=Number.isFinite(b.value);if(av!==bv)return av?-1:1;
  return (av?(sort.direction==='asc'?a.value-b.value:b.value-a.value):0)||a.index-b.index;
 }).map(item=>item.row);
}
function upChannelTable(rows,state){
 const sort=state.channelSort||{key:'gsvCents',direction:'desc'};
 const headers=upChannelColumns.map(([key,label])=>{
  const direction=sort.key===key?sort.direction:'',next=!direction?'降序':direction==='desc'?'升序':'恢复默认顺序';
  return `<button type="button" class="rp-sort-header" data-up-channel-sort="${key}" data-direction="${direction}" aria-label="${label}：${next}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>${netSalesHelp(key)}`;
 });
 return table(headers,upSortedChannelRows(rows,sort).map(r=>upChannelColumns.map(([key,,format])=>key==='channel'?esc(r.channel):Number.isFinite(r.gsvCents)?format(r):'—')));
}
function upApplyChannelSortAria(panel,state){
 const sort=state.channelSort||{key:'gsvCents',direction:'desc'};
 for(const button of panel.querySelectorAll('[data-up-channel-sort]'))button.closest('th').setAttribute('aria-sort',button.dataset.upChannelSort!==sort.key?'none':sort.direction==='asc'?'ascending':'descending');
}
function upMountOperating(root,m,state){
 const panel=root.querySelector('[data-up-panel="operating"]');upApplyChannelSortAria(panel,state);
 panel.onclick=e=>{
  const sort=e.target.closest('[data-up-channel-sort]');
  if(sort){
   state.channelSort||={key:'gsvCents',direction:'desc'};rpSortCycle(state.channelSort,sort.dataset.upChannelSort,{key:'gsvCents',direction:'desc'});
   const host=panel.querySelector('.up-platform-performance .up-table'),scroll=host.scrollLeft;
   const rows=upOperatingChannelRows(m.platformRows,m.channelRows||[]);host.innerHTML=upChannelTable(rows,state);upApplyChannelSortAria(panel,state);host.scrollLeft=scroll;
   const contribution=panel.querySelector('.up-channel-contribution'),chartScroll=contribution.querySelector('.up-contribution-scroll').scrollLeft;
   contribution.outerHTML=upChannelContributionView(rows,state,m.company);panel.querySelector('.up-contribution-scroll').scrollLeft=chartScroll;
   host.querySelector('[data-up-channel-sort="'+sort.dataset.upChannelSort+'"]').focus({preventScroll:true});return;
  }

 };
}
