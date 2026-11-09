// 首页按SPU展示六张卡；原入榜顺序与完整榜单记录保持独立。
function rpPlatformCardProducts(rows){
 const seen=new Set(),selected=[];
 for(const row of rows){
  const key=row.spuId;if(!key||seen.has(key))continue;
  seen.add(key);selected.push(row);if(selected.length===6)break;
 }
 return selected;
}
// 各平台单独查询同一期间，不复制所选平台的数据或重新判断入榜。
function rpPlatformCardFields(kind,record,platform){
 const {start,end}=upWindow(),product=upProduct(upIdentity(record));
 const source=kind===0?qrObservation(product,platform,start,end):copyFactRecord(record,{platform,channel:platform});
 const current=upSummary(upIdentity(record),start,end,platform);
 return rpFields(kind,source,kind===0?rpQualityCardKeys:rpReturnCardKeys,platform).map(field=>field.key==='netSales'&&(!Number.isFinite(current.sales)||!Number.isFinite(current.returned))?{...field,value:'—',sortValue:null,target:'',tone:'rp-quality-gray',targetTone:''}:field);
}
function rpPlatformMetricCell(field){
 return `<div role="group" class="rp-quality-metric rp-platform-metric" data-rp-field="${field.key}" data-value="${Number.isFinite(field.sortValue)?field.sortValue:''}" aria-label="${esc(field.name)}"><strong class="${esc(field.tone||'')}">${numberSignalMain(field)}</strong><small class="${esc(field.targetTone||'')}">${field.target?rpTargetText(field):'&nbsp;'}</small></div>`;
}
function rpPlatformProductCard(kind,record,index){
 const keys=kind===0?rpQualityCardKeys:rpReturnCardKeys;
 const labels={fine:'平台罚款',frozen:'资金冻结',offShelf:'链接下架',drop:'链接掉权',gsv:'GSV',return:'总退',received:'已收退',netSales:'销量'};
 const platforms=rpCardDisplayPlatforms(kind);
 const heading=`<div role="group" aria-label="指标名称" class="rp-platform-card-head"><span aria-hidden="true"></span>${keys.map(key=>`<span class="rp-platform-metric-label">${netSalesLabel(labels[key],key)}</span>`).join('')}</div>`;
 const rows=platforms.map(platform=>{
  const fields=rpPlatformCardFields(kind,record,platform);
  return `<div role="group" aria-label="${esc(platform)}" class="rp-platform-card-row" data-rp-platform-row="${esc(platform)}"><div class="rp-platform-card-logo"><button type="button" data-rp-platform-detail="${esc(JSON.stringify({spuId:record.spuId,platform}))}" aria-label="查看${esc(record.name)} · ${platform}详情">${rpPlatformMark(platform)}</button></div>${fields.map(rpPlatformMetricCell).join('')}</div>`;
 }).join('');
 return `<article class="rp-entry rp-quality-entry rp-platform-product ${kind===6?'rp-return-entry':''}" data-rp-kind="${kind}" data-rp-row="${kind}:${record.id}" data-rp-spu="${esc(record.spuId)}"><div class="rp-entry-main"><header><span class="rank">${String(index+1).padStart(2,'0')}</span>${rpIdentityMarkup(kind,record,false,true,false)}</header><div class="rp-platform-card-scroll"><div class="rp-platform-card-table" role="group" aria-label="${esc(record.name)}平台指标" style="--rp-platform-metrics:${keys.length}">${heading}${rows}</div></div></div></article>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#riskrail [data-rp-platform-detail]');if(!button)return;
 event.preventDefault();event.stopPropagation();
 const {spuId,platform}=JSON.parse(button.dataset.rpPlatformDetail);
 const kind=+button.closest('[data-rp-board]').dataset.rpBoard,period=rpDetailPeriod(kind);
 rpWithBoardPeriod(kind,()=>{const range=upWindow(period);upOpenDetail({spuId,platform,tab:'quality',module:'risk',period:{...period},...range})},period);
});

// 只读原始业绩审计，供页面数值与六平台取数范围交叉核对。
window.riskPlatformCardsSnapshot=()=>rpWithCardRows(()=>({
 range:upWindow(rpBoardPeriod(0)),boards:[0,6].map(kind=>rpWithBoardPeriod(kind,()=>{
  const range=upWindow(),comparison=riskRange(range.start,range.end);
  return {kind,range,previousStart:comparison.previousStart,previousEnd:comparison.previousEnd,displayPlatforms:rpCardDisplayPlatforms(kind),records:rpPlatformCardProducts(rpCardRows(kind)).map(record=>({spuId:record.spuId,platforms:qrPlatforms.map(platform=>{
   const current=upSummary(upIdentity(record),range.start,range.end,platform),previous=upSummary(upIdentity(record),comparison.previousStart,comparison.previousEnd,platform);
   return {platform,gsvCents:current.gsvCents,previousGsvCents:previous.gsvCents,netSales:Number.isFinite(current.sales)&&Number.isFinite(current.returned)?current.sales-current.returned:null,returnRate:current.returnRate,receivedRate:current.receivedRate,previousReturnRate:previous.returnRate,previousReceivedRate:previous.receivedRate};
  })}))};
 }))
}));
