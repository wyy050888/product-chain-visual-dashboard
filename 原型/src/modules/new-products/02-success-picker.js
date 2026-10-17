// 用带年份的季度键保存选择，切换浏览年份不丢失其他年份已选季度。
function nspSuccessSelectionText(){
 const groups=new Map();
 for(const key of pfSelected(nspFilters.successQuarter).sort()){
  const [year,quarter]=key.split('-');
  if(!groups.has(year))groups.set(year,[]);
  groups.get(year).push(quarter);
 }
 return [...groups].map(([year,quarters])=>`${year.slice(-2)}年 ${quarters.join('、')}`).join('；')||'全部';
}
function nspSuccessPickerHTML(){
 const text=nspSuccessSelectionText();
 return `<div class="nsp-launch-filter nsp-success-filter"><button type="button" class="nsp-launch-trigger" aria-label="成功季度筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="nsp-success-panel"><span>成功季度</span><span data-nsp-success-value title="${esc(text)}">${esc(text)}</span><span aria-hidden="true">▾</span></button><div id="nsp-success-panel" class="nsp-period-panel" popover="auto" role="dialog" aria-label="选择成功季度"></div></div>`;
}
function nspBindSuccessPicker(host){
 const root=host.querySelector('.nsp-success-filter'),trigger=root.querySelector('button'),panel=root.querySelector('[popover]');
 let year=periodFor('new').year;
 const position=()=>{
  const anchor=trigger.getBoundingClientRect(),box=panel.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(anchor.left,innerWidth-box.width-8))+'px';
  panel.style.top=Math.max(8,anchor.bottom+8+box.height<=innerHeight?anchor.bottom+8:anchor.top-box.height-8)+'px';
 };
 const close=()=>{if(panel.matches(':popover-open'))panel.hidePopover()};
 const render=()=>{
  const selected=pfSelected(nspFilters.successQuarter);
  panel.innerHTML=`<div class="nsp-launch-calendar"><div class="nsp-launch-year"><button type="button" data-success-step="-1" aria-label="成功季度上一年">«</button><span>${year}年</span><button type="button" data-success-step="1" aria-label="成功季度下一年">»</button></div><div class="nsp-launch-options" role="group" aria-label="成功季度多选">${[1,2,3,4].map(q=>`<button type="button" role="checkbox" aria-checked="${selected.includes(`${year}-Q${q}`)}" data-success-quarter="${year}-Q${q}"><i aria-hidden="true"></i>第${q}季度</button>`).join('')}</div><div class="nsp-success-footer"><button type="button" data-success-all>全部</button><span>可多选季度</span></div></div>`;
  if(panel.matches(':popover-open'))position();
 };
 const update=values=>{
  nspFilters.successQuarter=values.length?values.sort():'all';
  const label=trigger.querySelector('[data-nsp-success-value]'),text=nspSuccessSelectionText();
  label.textContent=text;label.title=text;
  newProductSelection.page=1;nspRefreshResults();render();
 };
 trigger.onclick=()=>{
  if(panel.matches(':popover-open')){close();return}
  const first=pfSelected(nspFilters.successQuarter)[0];
  year=first?Number(first.slice(0,4)):periodFor('new').year;
  render();panel.showPopover();position();panel.querySelector('[data-success-quarter]')?.focus({preventScroll:true});
 };
 panel.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.successStep){year=Math.max(1,Math.min(9999,year+Number(button.dataset.successStep)));render();panel.querySelector(`[data-success-step="${button.dataset.successStep}"]`).focus({preventScroll:true})}
  else if(button.dataset.successQuarter){
   const key=button.dataset.successQuarter,selected=pfSelected(nspFilters.successQuarter);
   update(selected.includes(key)?selected.filter(q=>q!==key):[...selected,key]);
   panel.querySelector(`[data-success-quarter="${key}"]`).focus({preventScroll:true});
  }else if(button.hasAttribute('data-success-all')){update([]);close();trigger.focus({preventScroll:true})}
 };
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();trigger.focus({preventScroll:true})}});
 let listeners=null;
 panel.addEventListener('toggle',()=>{
  const open=panel.matches(':popover-open');trigger.setAttribute('aria-expanded',String(open));
  listeners?.abort();listeners=null;if(!open)return;
  listeners=new AbortController();window.addEventListener('resize',position,{signal:listeners.signal});
  document.addEventListener('scroll',e=>{if(!panel.contains(e.target))position()},{capture:true,signal:listeners.signal});
 });
}
