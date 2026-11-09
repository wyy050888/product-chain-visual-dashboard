// 季品平铺展示；仍用公共多选规则，同字段取并集，仅改变本模块范围。
let ipSeasonSelection='all';
function ipSeasonLedger(records){
 return records.filter(row=>pfIncludes(ipSeasonSelection,pfIdentity(row).attribute));
}
function ipMountSeasonFilter(){
 const title=$('#inventory>.sectionhead>.titlegroup');let host=title.querySelector('.ip-season-filter');
 if(!host){host=document.createElement('span');host.className='ip-season-filter';title.append(host)}
 const choices=[['all','全部'],...filterCatalog.seasons.map(value=>[value,value])];
 host.innerHTML=`<select id="ip-season" multiple hidden tabindex="-1" aria-label="库存季品">${pfOptions(filterCatalog.seasons,ipSeasonSelection,'全部')}</select><span class="ip-season-tabs" role="group" aria-label="库存季品">${choices.map(([value,label])=>`<button type="button" data-ip-season="${value}" aria-pressed="${pfOptionSelected(ipSeasonSelection,value)}">${label}</button>`).join('')}</span>`;
 host.onclick=event=>{
  const button=event.target.closest('[data-ip-season]');if(!button)return;
  const value=button.dataset.ipSeason,select=host.querySelector('#ip-season');
  pfControlSet(select,pfToggleChoice(ipSeasonSelection,value));select.dispatchEvent(new Event('change',{bubbles:true}));
  host.querySelector('[data-ip-season="'+value+'"]').focus({preventScroll:true});
 };
 host.onkeydown=event=>{
  const button=event.target.closest('[data-ip-season]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const buttons=[...host.querySelectorAll('[data-ip-season]')],index=buttons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
  buttons[next].focus({preventScroll:true});
 };
 host.onchange=event=>{
  if(event.target.id!=='ip-season')return;
  ipSeasonSelection=pfControlValue(event.target);renderInventory();
 };
}
