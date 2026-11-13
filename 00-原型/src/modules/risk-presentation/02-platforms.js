// 产品违规和退货各自多选平台；店铺独立单选，库存固定公司口径，亏损独立。
const rpCardPlatformState={value:'all'};
const rpShopPlatformState={value:'抖音'};
let rpDeviationPlatform='all';
// 违规/退货季品各自单选，库存两榜季品联动单选，其余榜独立多选；筛选后取 TOP 6。
// 两个实时库存榜仅在初始化时按数据日聚焦当季品，重绘不覆盖手动选择。
function rpStockDefaultSeason(date=DATA_CUTOFF){
 const quarter=Math.ceil(Number(date.slice(5,7))/3);
 return quarter===4?'冬季品':quarter===2?'夏季品':'all';
}
const rpCardSeasons={0:'all',2:'all',3:rpStockDefaultSeason(),4:rpStockDefaultSeason(),6:'all'};
const rpSeasonChoices=filterCatalog.seasons;
function rpStockSeasonLinked(k){return k===3||k===4}
function rpCardSeasonSingle(k){return k===0||k===6||rpStockSeasonLinked(k)}
function rpCardSeasonControl(k,hidden=false){
 if(!(k in rpCardSeasons))return '';
 return `<select ${rpCardSeasonSingle(k)?'':'multiple '}${hidden?'hidden tabindex="-1"':'data-pf-multiple data-pf-label="季品"'} data-rp-card-season="${k}" aria-label="${esc(rpTitles[k])}季品">${pfOptions(rpSeasonChoices,rpCardSeasons[k],'全部')}</select>`;
}


// 违规、退货和库存季品标签用radio，联动范围仍仅限库存两榜。
function rpCardSeasonTags(k){
 const value=rpCardSeasons[k],label=rpTitles[k]+'季品',rows=rpRowsForPlatform(k,rpCardPlatform(k)),single=rpCardSeasonSingle(k);
 const choices=[{value:'all',label:'全部'},...rpSeasonChoices.map(value=>({value,label:value}))];
 const buttons=choices.map(option=>{
  // 忽略标签自身已选季品，以完整入榜集合统计，保持各选项数量稳定。
  const count=rows.filter(row=>pfMatches(row,{...rpCardProductFilters(k),attribute:option.value})).length;
  const selected=pfOptionSelected(value,option.value),state=single?'role="radio" aria-checked="'+selected+'" tabindex="'+(selected?'0':'-1')+'"':'aria-pressed="'+selected+'"';
  return '<button type="button" class="rp-season-tag" data-rp-season-option="'+option.value+'" '+state+' aria-label="'+esc(option.label+'，'+count+'条入榜记录')+'" title="'+esc(option.label+' · '+count+'条入榜记录')+'">'+option.label+'<b class="rp-platform-count rp-season-count">'+count+'</b></button>';
 }).join('');
 return '<div class="rp-season-menu rp-card-facets" data-rp-season-menu="'+k+'">'+rpCardSeasonControl(k,true)+'<div class="rp-season-tags" role="'+(single?'radiogroup':'group')+'" aria-label="'+esc(label)+'">'+buttons+'</div></div>';
}

// 数量使标签更宽时，仅滚动标签条，保证键盘焦点可见。
function rpFocusSeasonTag(button){
 if(!button)return;button.focus({preventScroll:true});
 const strip=button.closest('.rp-season-tags'),item=button.getBoundingClientRect(),box=strip.getBoundingClientRect();
 if(item.left<box.left)strip.scrollLeft-=box.left-item.left+2;
 else if(item.right>box.right)strip.scrollLeft+=item.right-box.right+2;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#riskrail [data-rp-season-option]');if(!button)return;
 const menu=button.closest('[data-rp-season-menu]'),k=menu.dataset.rpSeasonMenu,value=button.dataset.rpSeasonOption,select=menu.querySelector('select');
 if(rpCardSeasonSingle(Number(k))&&select.value===value)return;
 pfControlSet(select,rpCardSeasonSingle(Number(k))?value:pfToggleChoice(pfControlValue(select),value));
 select.dispatchEvent(new Event('change',{bubbles:true}));
 rpFocusSeasonTag(document.querySelector('#riskrail [data-rp-season-menu="'+k+'"] [data-rp-season-option="'+value+'"]'));
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('#riskrail [data-rp-season-option]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const buttons=[...button.parentElement.querySelectorAll('button')],index=buttons.indexOf(button);
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
 if(rpCardSeasonSingle(Number(button.closest('[data-rp-season-menu]').dataset.rpSeasonMenu)))buttons[next].click();
 else rpFocusSeasonTag(buttons[next]);
});

const rpQualityPlatformKinds=[0,6,8],rpQualityDefaultPlatforms=['抖音','天猫'];
function rpSetQualityPlatform(kind,platform){
 if(!rpQualityPlatformKinds.includes(kind))return false;
 const selected=pfSelected(platform);if(!selected.every(value=>qrPlatforms.includes(value)))return false;
 const channels=qrPlatforms.filter(value=>selected.includes(value));
 platform=!channels.length||channels.length===qrPlatforms.length?'all':channels.length===1?channels[0]:channels;
 // 只更新当前榜；完整榜单继承本榜选择，且持有独立数组，避免回写首页或另一个榜。
 const listPlatform=Array.isArray(platform)?[...platform]:platform;
 if(kind===0){qrState.platform=platform;qrState.listPlatform=listPlatform}
 else{
  if(kind===6)rrState.platform=platform;
  else rpDeviationPlatform=platform;
  rfState.listPlatforms[kind]=listPlatform;
 }
 return true;
}
for(const kind of rpQualityPlatformKinds)rpSetQualityPlatform(kind,rpQualityDefaultPlatforms);
brState.platform=rpShopPlatformState.value;rfState.listPlatforms[1]=rpShopPlatformState.value;
function rpCardPlatform(k){return k===1?rpShopPlatformState.value:k===0?qrState.platform:k===6?rrState.platform:k===8?rpDeviationPlatform:[3,4].includes(k)?'all':rpCardPlatformState.value}
function rpCardDisplayPlatforms(kind){return qrPlatforms.filter(platform=>pfIncludes(rpCardPlatform(kind),platform))}
function rpPlatformOptions(value,includeAll=true){return [...(includeAll?['all']:[]),...qrPlatforms].map(p=>`<option value="${p}" ${pfOptionSelected(value,p)?'selected':''}>${p==='all'?'全平台':p}</option>`).join('')}
function rpPlatformValue(control){const selected=pfSelected(pfControlValue(control));return selected.length===0?'all':selected.length===1?selected[0]:selected}
function rpCardPlatformControl(k){return [0,6].includes(k)?rpCardSeasonTags(k):[2,3,4].includes(k)?'':rpCardSeasonControl(k)}
// 一次同步渲染内，榜单、季品数量和平台数量复用同一份入榜结果；结束即释放。
let rpCardRowBatch=null;
function rpWithCardRows(read){
 if(rpCardRowBatch)return read();
 rpCardRowBatch=new Map();
 try{return read()}finally{rpCardRowBatch=null}
}
function rpRowsForPlatform(k,platform){
 const key=JSON.stringify([k,platform,periodKey(periodFor('risk'))]);
 if(rpCardRowBatch?.has(key))return rpCardRowBatch.get(key);
 const rows=rpComputeRowsForPlatform(k,platform);
 if(rpCardRowBatch)rpCardRowBatch.set(key,rows);
 return rows;
}
function rpComputeRowsForPlatform(k,platform){
 if(k===0)return qrRows(platform);
 if(k===1)return brShopRows().filter(r=>pfIncludes(platform,r.channel));
 if(k===6){const before=rrState.platform;rrState.platform=Array.isArray(platform)?'all':platform;try{return rrRows().filter(r=>pfIncludes(platform,r.channel))}finally{rrState.platform=before}}
 if(k===8)return rpDeviationRows(platform);
 const w=upWindow();
 if(k===2)return rpLossRows(platform);
 if(k===4){
  return srSeasonFilter(4,rpStagnantRows());
 }
 if(k===3)return srSeasonFilter(3,rpShortageRows());
 return rfRows(k);
}
function rpCardRows(k,platform=rpCardPlatform(k)){
 const filters=rpCardProductFilters(k);
 return rpRowsForPlatform(k,platform).filter(row=>pfMatches(row,filters));
}
document.addEventListener('change',e=>{
 const select=e.target.closest('#riskrail [data-rp-card-season]');
 if(!select)return;
 const k=Number(select.dataset.rpCardSeason),value=pfControlValue(select);
 if(!(k in rpCardSeasons)||!pfSelected(value).every(v=>rpSeasonChoices.includes(v)))return;
 if(rpStockSeasonLinked(k)){
  if(typeof value!=='string')return;
  rpCardSeasons[3]=value;rpCardSeasons[4]=value;renderRisks([3,4]);
 }else{rpCardSeasons[k]=value;renderRisks([k])}
 document.querySelector('#riskrail [data-rp-card-season="'+k+'"]')?.focus({preventScroll:true});
});
document.addEventListener('change',e=>{
 const select=e.target.closest('#riskrail [data-rp-card-platform]');
 if(!select)return;
 const platform=rpPlatformValue(select);if(!pfSelected(platform).every(v=>qrPlatforms.includes(v)))return;
 const kind=Number(select.dataset.rpCardPlatform),quality=rpQualityPlatformKinds.includes(kind);
 if(quality){
  if(!rpSetQualityPlatform(kind,platform))return;
 }else if(kind===1){
  if(!qrPlatforms.includes(platform))return;
  rpShopPlatformState.value=platform;brState.platform=platform;rfState.listPlatforms[1]=platform;
 }else{rpCardPlatformState.value=platform}
 renderRisks([kind]);
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
