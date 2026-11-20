// 季品平铺展示；仍用公共多选规则，同字段取并集，仅改变本模块范围。
let ipSeasonSelection='all';
function ipSeasonLedger(records){
 return records.filter(row=>pfIncludes(ipSeasonSelection,pfIdentity(row).attribute));
}
function ipFilterTabs(label,choices,selection,attribute){
 const buttons=['all',...choices].map(value=>{
  return `<button type="button" ${attribute}="${esc(value)}" aria-pressed="${pfOptionSelected(selection,value)}">${value==='all'?'全部':esc(value)}</button>`;
 }).join('');
 return `<span class="ip-season-tabs" role="group" aria-label="${esc(label)}">${buttons}</span>`;
}
function ipFilterTabInDirection(button,key){
 if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(key))return null;
 const buttons=[...button.parentElement.children],index=buttons.indexOf(button);
 const next=key==='Home'?0:key==='End'?buttons.length-1:(index+(key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
 return buttons[next];
}
function ipMountSeasonFilter(){
 const title=$('#inventory>.sectionhead>.titlegroup');let host=title.querySelector('.ip-season-filter');
 if(!host){host=document.createElement('span');host.className='ip-season-filter';title.append(host)}
 host.innerHTML=`<select id="ip-season" multiple hidden tabindex="-1" aria-label="库存季品">${pfOptions(filterCatalog.seasons,ipSeasonSelection,'全部')}</select>${ipFilterTabs('库存季品',filterCatalog.seasons,ipSeasonSelection,'data-ip-season')}`;
 host.onclick=event=>{
  const button=event.target.closest('[data-ip-season]');if(!button)return;
  const value=button.dataset.ipSeason,select=host.querySelector('#ip-season');
  pfControlSet(select,pfToggleChoice(ipSeasonSelection,value));select.dispatchEvent(new Event('change',{bubbles:true}));
  host.querySelector('[data-ip-season="'+value+'"]').focus({preventScroll:true});
 };
 host.onkeydown=event=>{
  const next=ipFilterTabInDirection(event.target.closest('[data-ip-season]'),event.key);if(!next)return;
  event.preventDefault();next.focus({preventScroll:true});
 };
 host.onchange=event=>{
  if(event.target.id!=='ip-season')return;
  ipSeasonSelection=pfControlValue(event.target);renderInventory();
 };
}
