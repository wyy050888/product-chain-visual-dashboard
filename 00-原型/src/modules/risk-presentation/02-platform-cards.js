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
 if(kind===8)return rpFields(kind,record,rpDeviationCardKeys,platform);
 if(kind===0){
  const {start,end}=upWindow(),product=upProduct(upIdentity(record));
  return rpFields(kind,qrObservation(product,platform,start,end),rpQualityCardKeys,platform);
 }
 return rpFields(kind,record,rpReturnCardKeys,platform);
}
function rpPlatformMetricCell(field,comparisonHeading){
 const comparison=field.target?rpTargetText(field,!comparisonHeading):'&nbsp;';
 const actual=esc(field.value);
 const actualValue=Number.isFinite(field.sortValue)?`<span class="rp-card-actual-value">${actual}</span>`:actual;
 const plainActual=field.cardActualOnly||field.key==='offShelf'||field.key==='drop';
 const primary=field.cardComparisonFirst?comparison:plainActual?actualValue:numberSignalMain(field);
 const secondary=field.cardComparisonFirst?`<span>实际 ${actualValue}</span>`:comparison;
 const primaryTone=field.cardComparisonFirst?field.targetTone:field.tone;
 const secondaryTone=field.cardComparisonFirst?'rp-quality-gray':field.targetTone;
 const secondaryLine=field.cardActualOnly?'':`<small class="${esc(secondaryTone||'')}">${secondary}</small>`;
 const flatComparison=field.cardComparisonFirst&&field.target==='环比 持平';
 return `<div role="group" class="rp-quality-metric rp-platform-metric" data-rp-field="${field.key}" data-value="${Number.isFinite(field.sortValue)?field.sortValue:''}" aria-label="${esc(comparisonHeading||field.name)}"${field.cardComparisonFirst?' data-comparison-first':''}${field.hint&&field.key==='unreceived'?' title="'+esc(field.hint)+'"':''}><strong class="${esc(primaryTone||'')}"${flatComparison?' data-flat-comparison':''}>${primary}</strong>${secondaryLine}</div>`;
}
function rpPlatformCardGsvLabel(){
 const period=periodFor('risk'),label=periodShortText(period);
 if(period.comparisonMode){
  const {start,end}=upWindow(period);
  if(start===end)return start.slice(5)+' GSV';
  if(period.comparisonMode==='month'&&end===shiftDate(dateRangeMonthShift(start.slice(0,7),1)+'-01',-1))return period.value+'月 GSV';
  const day=date=>Number(date.slice(5,7))+'/'+Number(date.slice(8));
  return day(start)+'–'+day(end)+' GSV';
 }
 if(label==='近30天')return '近30日 GSV';
 return period.mode==='day'?'GSV':label+' GSV';
}
function rpPlatformDetailAttr(spuId,platform){
 return `data-rp-platform-detail="${esc(JSON.stringify({spuId,platform}))}"`;
}
function rpPlatformProductCard(kind,record,index,rankedRows){
 const keys=kind===0?rpQualityCardKeys:kind===8?rpDeviationCardKeys:rpReturnCardKeys;
 const labels={fine:'平台罚款',frozen:'资金冻结',offShelf:'链接下架',drop:'链接掉权',gsv:rpPlatformCardGsvLabel(),return:'总退',received:'已收退',unreceived:'未收退'};
 if(kind===6)for(const key of rpReturnRateKeys)labels[key]+='环比';
 if(kind===8){labels.return+='偏差';labels.received+='偏差';}
 const platformRows=kind===0?null:new Map(rankedRows.filter(row=>row.spuId===record.spuId).map(row=>[row.channel,row]));
 const platforms=rpCardDisplayPlatforms(kind).filter(platform=>platformRows?platformRows.has(platform):record.violatedPlatforms.includes(platform));
 const heading=`<div role="group" aria-label="指标名称" class="rp-platform-card-head"><span aria-hidden="true"></span>${keys.map(key=>`<span class="rp-platform-metric-label" data-rp-metric-label="${key}">${esc(labels[key])}</span>`).join('')}</div>`;
 const rows=platforms.map(platform=>{
  const fields=rpPlatformCardFields(kind,platformRows?platformRows.get(platform):record,platform);
  return `<div role="group" aria-label="${esc(platform)}" class="rp-platform-card-row" data-rp-platform-row="${esc(platform)}"><div class="rp-platform-card-logo"><button type="button" ${rpPlatformDetailAttr(record.spuId,platform)} aria-label="查看${esc(record.name)} · ${platform}详情">${rpPlatformMark(platform)}</button></div>${fields.map(field=>rpPlatformMetricCell(field,field.cardComparisonFirst?labels[field.key]:null)).join('')}</div>`;
 }).join('');
 return `<article class="rp-entry rp-quality-entry rp-platform-product ${kind===6?'rp-return-entry':''}" data-rp-kind="${kind}" data-rp-row="${kind}:${record.id}" data-rp-spu="${esc(record.spuId)}"><div class="rp-entry-main"><header><span class="rank">${String(index+1).padStart(2,'0')}</span>${rpIdentityMarkup(kind,record,false,true,false)}</header><div class="rp-platform-card-scroll"><div class="rp-platform-card-table" role="group" aria-label="${esc(record.name)}平台指标" style="--rp-platform-metrics:${keys.length}">${heading}${rows}</div></div></div></article>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#riskrail [data-rp-platform-detail],#dialogbody [data-rp-platform-detail]');if(!button)return;
 event.preventDefault();event.stopPropagation();
 const {spuId,platform}=JSON.parse(button.dataset.rpPlatformDetail);
 const kind=Number(button.closest('[data-rp-board]')?.dataset.rpBoard||$('#dialogbody').dataset.riskRankingKind||8);
 const period=rpDetailPeriod(kind);
 rpWithBoardPeriod(kind,()=>{const range=upWindow(period);upOpenDetail({spuId,platform,tab:'quality',module:'risk',rankingKind:kind,period:{...period},...range})},period);
});

// 只读原始业绩审计，供页面数值与六平台取数范围交叉核对。
window.riskPlatformCardsSnapshot=()=>rpWithCardRows(()=>({
 range:upWindow(rpBoardPeriod(0)),boards:[0,6].map(kind=>rpWithBoardPeriod(kind,()=>{
  const range=upWindow(),comparison=riskRange(range.start,range.end),rows=rpCardRows(kind);
  const summaryRecords=kind===0?rpCardRows(kind,'all').map(({spuId,monthly})=>({spuId,events:monthly.events})):undefined;
  return {kind,range,previousStart:comparison.previousStart,previousEnd:comparison.previousEnd,displayPlatforms:rpCardDisplayPlatforms(kind),summaryRecords,records:rpPlatformCardProducts(rows).map(record=>({spuId:record.spuId,violatedPlatforms:kind===0?record.violatedPlatforms:rows.filter(row=>row.spuId===record.spuId).map(row=>row.channel),platforms:qrPlatforms.map(platform=>{
   const current=upSummary(upIdentity(record),range.start,range.end,platform),previous=upSummary(upIdentity(record),comparison.previousStart,comparison.previousEnd,platform);
   return {platform,gsvCents:current.gsvCents,previousGsvCents:previous.gsvCents,netSales:Number.isFinite(current.sales)&&Number.isFinite(current.returned)?current.sales-current.returned:null,returnRate:current.returnRate,receivedRate:current.receivedRate,previousReturnRate:previous.returnRate,previousReceivedRate:previous.receivedRate};
  })}))};
 }))
}));
