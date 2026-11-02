// 产品两榜平台多选；店铺独立单选且不提供全平台，数量取完整入榜集合。
function rpPlatformMenuLabel(platform){
 return platform==='all'?'<span>全平台</span>':rpPlatformMark(platform);
}
function rpPlatformCounts(kind,currentRows){
 const selected=rpCardPlatform(kind);
 const matchSeason=rows=>rows.filter(row=>pfMatches(row,rpCardProductFilters(kind)));
 // 品质和退货按平台记录、店铺按所属平台分组；亏损须按各平台重新判定净利，不能拆分公司亏损结果。
 const pool=[0,1,6].includes(kind)?matchSeason(rpRowsForPlatform(kind,'all')):null;
 return new Map(['all',...qrPlatforms].map(platform=>{
  const count=platform===selected?currentRows.length:pool?(platform==='all'?pool.length:pool.filter(row=>kind===0?row.violatedPlatforms.includes(platform):row.channel===platform).length):matchSeason(rpRowsForPlatform(kind,platform)).length;
  return [platform,count];
 }));
}
function rpPlatformMenu(kind,rows){
 if([3,4].includes(kind))return rpCardSeasonTags(kind);
 const value=rpCardPlatform(kind),multiple=rpQualityPlatformKinds.includes(kind),counts=rpPlatformCounts(kind,rows),label=rpTitles[kind]+'平台';
 const includeAll=kind!==1,hint='入榜记录数随期间和季品更新'+(kind===0?'；同一SPU全平台去重，各平台筛选该平台有品质处罚的SPU，排序仍按全平台违规总次数及近30天GSV':kind===6?'；按SPU×平台逐条统计，同一SPU跨平台分别入榜':kind===1?'；按店铺所属平台统计':'；全平台沿用整体统计口径，不将各平台数量相加');
 const buttons=[...(includeAll?['all']:[]),...qrPlatforms].map(platform=>{
  const selected=pfOptionSelected(value,platform),name=platform==='all'?'全平台':platform,count=counts.get(platform);
  return '<button type="button" class="rp-platform-tag" role="'+(multiple?'checkbox':'radio')+'" tabindex="'+(multiple||selected?'0':'-1')+'" aria-checked="'+selected+'" aria-label="'+esc(name+'，'+count+'条入榜记录')+'" title="'+esc(name+' · '+count+'条入榜记录')+'" data-rp-platform-option="'+platform+'">'+rpPlatformMenuLabel(platform)+'<b class="rp-platform-count">'+count+'</b></button>';
 }).join('');
 return '<div class="rp-platform-menu rp-card-facets" data-rp-platform-menu="'+kind+'"><div class="rp-platform-tags" role="'+(multiple?'group':'radiogroup')+'" aria-label="'+esc(label)+'" title="'+esc(hint)+'">'+buttons+'</div><select '+(multiple?'multiple ':'')+'hidden tabindex="-1" data-rp-card-platform="'+kind+'" aria-label="'+esc(label)+'">'+rpPlatformOptions(value,includeAll)+'</select>'+rpReturnProductTypeControl(kind)+'</div>';
}
// 多选方向键只移动焦点；焦点移出可见区域时只滚动标签条。
function rpFocusPlatformOption(button){
 if(!button)return;button.focus({preventScroll:true});
 const strip=button.closest('.rp-platform-tags'),item=button.getBoundingClientRect(),box=strip.getBoundingClientRect();
 if(item.left<box.left)strip.scrollLeft-=box.left-item.left+3;
 else if(item.right>box.right)strip.scrollLeft+=item.right-box.right+3;
}
document.addEventListener('click',event=>{
 const option=event.target.closest('#riskrail [data-rp-platform-option]');if(!option)return;
 const menu=option.closest('[data-rp-platform-menu]'),kind=menu.dataset.rpPlatformMenu,value=option.dataset.rpPlatformOption;
 const select=menu.querySelector('select');
 const next=rpQualityPlatformKinds.includes(Number(kind))?pfToggleChoice(rpPlatformValue(select),value):value;
 pfControlSet(select,next);select.dispatchEvent(new Event('change',{bubbles:true}));
 rpFocusPlatformOption(document.querySelector('#riskrail [data-rp-platform-menu="'+kind+'"] [data-rp-platform-option="'+value+'"]'));
});
document.addEventListener('keydown',event=>{
 const option=event.target.closest('#riskrail [data-rp-platform-option]');if(!option||event.altKey||event.ctrlKey||event.metaKey)return;
 if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();
 const options=[...option.closest('.rp-platform-tags').querySelectorAll('[data-rp-platform-option]')],index=options.indexOf(option);
 const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+options.length)%options.length;
 if(rpQualityPlatformKinds.includes(Number(option.closest('[data-rp-platform-menu]').dataset.rpPlatformMenu)))rpFocusPlatformOption(options[next]);
 else options[next].click();
},true);
