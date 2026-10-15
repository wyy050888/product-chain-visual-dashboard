// 品质榜独立选择平台集合；库存与呆滞榜固定公司口径，其余榜沿用共用平台集合。
const rpCardPlatformState={value:'all'};
// 季品按卡片独立保存；共用产品主数据口径，筛选后再截取 TOP 6。
const rpCardSeasons={0:'all',2:'all',3:'all',4:'all',6:'all'};
const rpSeasonChoices=['夏季品','冬季品','四季品'];
function rpCardSeasonControl(k){
 if(!(k in rpCardSeasons))return '';
 return `<select multiple data-pf-multiple data-pf-label="季品" data-rp-card-season="${k}" aria-label="${esc(rpTitles[k])}季品">${pfOptions(rpSeasonChoices,rpCardSeasons[k],'全部产品')}</select>`;
}

qrState.platform='抖音';
brState.platform=rrState.platform=rpCardPlatformState.value;
function rpCardPlatform(k){return k===0?qrState.platform:[3,4].includes(k)?'all':rpCardPlatformState.value}
function rpPlatformOptions(value,includeAll=true){return [...(includeAll?['all']:[]),...qrPlatforms].map(p=>`<option value="${p}" ${pfOptionSelected(value,p)?'selected':''}>${p==='all'?'全平台':p}</option>`).join('')}
function rpPlatformValue(control){const selected=pfSelected(pfControlValue(control));return selected.length===0?'all':selected.length===1?selected[0]:selected}
function rpCardPlatformControl(k){return ([3,4].includes(k)?'':rpPlatformMenu(k))+rpCardSeasonControl(k)}
function rpRowsForPlatform(k,platform){
 if(k===0)return Array.isArray(platform)?qrRows('all').filter(r=>platform.includes(r.platform)):qrRows(platform);
 if(k===1)return brShopRows().filter(r=>pfIncludes(platform,r.channel));
 if(k===6){const before=rrState.platform;rrState.platform=Array.isArray(platform)?'all':platform;try{return rrRows().filter(r=>pfIncludes(platform,r.channel))}finally{rrState.platform=before}}
 const w=upWindow();
 if(k===2)return rpLossRows(platform);
 if(k===4){
  return srSeasonFilter(4,srRows().map(r=>upPlatformStockFacts(r,'all')).filter(r=>r.slow));
 }
 if(k===3)return srSeasonFilter(3,rpCompanyStockRows());
 return rfRows(k);
}
function rpCardRows(k){return rpRowsForPlatform(k,rpCardPlatform(k)).filter(r=>pfMatches(r,{attribute:rpCardSeasons[k]||'all'}))}
document.addEventListener('change',e=>{
 const select=e.target.closest('#riskrail [data-rp-card-season]');
 if(!select)return;
 const k=Number(select.dataset.rpCardSeason),value=pfControlValue(select);
 if(!(k in rpCardSeasons)||!pfSelected(value).every(v=>rpSeasonChoices.includes(v)))return;
 rpCardSeasons[k]=value;renderRisks();
 document.querySelector('#riskrail [data-rp-card-season="'+k+'"]')?.focus({preventScroll:true});
});
document.addEventListener('change',e=>{
 const select=e.target.closest('#riskrail [data-rp-card-platform]');
 if(!select)return;
 const platform=rpPlatformValue(select);if(!pfSelected(platform).every(v=>qrPlatforms.includes(v)))return;
 if(Number(select.dataset.rpCardPlatform)===0){
  qrState.platform=platform;
 }else{
  rpCardPlatformState.value=platform;
  brState.platform=rrState.platform=platform;
 }
 renderRisks();
});
// 新版卡片入口带入平台；详情使用原有统一SPU模型，不额外叠加一层抽屉。
document.addEventListener('click',e=>{
 const button=e.target.closest('#riskrail [data-riskitem],#dialogbody .rp-list-table [data-riskitem]');
 if(!button)return;
 const [k,id]=button.dataset.riskitem.split(',').map(Number);
 if(![2,3,4].includes(k))return;
 const fromCard=Boolean(button.closest('#riskrail')),platform=[3,4].includes(k)?'all':fromCard?rpCardPlatformState.value:(rfState.listPlatforms[k]||'all');
 const row=withPeriod('risk',()=>(fromCard?rpCardRows(k):rpListRows(k)).find(r=>r.id===id));
 if(!row)return;
 e.stopImmediatePropagation();
 withPeriod('risk',()=>upEntry(row,'risk',k===2?'operating':'stock',platform));
},true);
