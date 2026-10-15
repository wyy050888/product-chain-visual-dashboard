// 上线期间独立于业绩统计期间；选中完整自然期间后转换为闭区间。
// 默认取访问时的当前年份，不跟随样例数据截止日或右上角统计期间。
let nspLaunchSelection={mode:'year',year:new Date().getFullYear(),value:1};
const nspDefaultLaunchRange=nspLaunchRange(nspLaunchSelection.mode,nspLaunchSelection.year,nspLaunchSelection.value);
nspFilters.launchStart=nspDefaultLaunchRange.start;
nspFilters.launchEnd=nspDefaultLaunchRange.end;
function nspLaunchRange(mode,year,value){
 const month=mode==='year'?1:mode==='quarter'?(value-1)*3+1:value;
 const endMonth=mode==='year'?12:mode==='quarter'?month+2:month;
 const monthEnd=new Date(0);monthEnd.setUTCFullYear(year,endMonth,0);
 const lastDay=monthEnd.getUTCDate();
 const date=(m,d)=>`${String(year).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 return {start:date(month,1),end:date(endMonth,lastDay)};
}
function nspLaunchLabel(selection){
 if(!selection)return '请选择日期';
 const {mode,year,value}=selection;
 return `${year}年${mode==='year'?'':mode==='quarter'?` 第${value}季度`:` ${value}月`}`;
}
function nspLaunchPickerHTML(){
 return `<div class="nsp-launch-filter"><button type="button" class="nsp-launch-trigger" aria-label="上线日期筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="nsp-launch-panel"><span>上线日期</span><span data-nsp-launch-value class="${nspLaunchSelection?'':'muted'}">${nspLaunchLabel(nspLaunchSelection)}</span><span aria-hidden="true">▾</span></button><button type="button" class="nsp-launch-clear" aria-label="清空上线日期" ${nspLaunchSelection?'':'hidden'}>×</button><div id="nsp-launch-panel" class="nsp-launch-panel nsp-period-panel" popover="auto" role="dialog" aria-label="选择上线期间"></div></div>`;
}
function nspBindLaunchFilter(host,rows){
 host=host.querySelector('.nsp-launch-filter:not(.nsp-success-filter)');
 const trigger=host.querySelector('.nsp-launch-trigger'),panel=host.querySelector('.nsp-launch-panel'),clear=host.querySelector('.nsp-launch-clear');
 let mode='year',year=new Date().getFullYear(),yearStart=Math.floor(year/10)*10;
 const position=()=>{
  const anchor=trigger.getBoundingClientRect(),box=panel.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(anchor.left,innerWidth-box.width-8))+'px';
  panel.style.top=Math.max(8,anchor.bottom+8+box.height<=innerHeight?anchor.bottom+8:anchor.top-box.height-8)+'px';
 };
 const close=()=>{if(panel.matches(':popover-open'))panel.hidePopover()};
 const apply=selection=>{
  nspLaunchSelection=selection;
  const range=selection?nspLaunchRange(selection.mode,selection.year,selection.value):{start:'',end:''};
  nspFilters.launchStart=range.start;nspFilters.launchEnd=range.end;
  const label=trigger.querySelector('[data-nsp-launch-value]');label.textContent=nspLaunchLabel(selection);label.classList.toggle('muted',!selection);
  clear.hidden=!selection;close();newProductSelection.page=1;nspTable(rows);trigger.focus({preventScroll:true});
 };
 const render=()=>{
  const values=mode==='year'?Array.from({length:9},(_,i)=>yearStart+i):Array.from({length:mode==='quarter'?4:12},(_,i)=>i+1);
  panel.innerHTML=`<nav class="nsp-launch-modes" aria-label="上线日期粒度">${[['year','自然年'],['quarter','自然季度'],['month','自然月']].map(([key,label])=>`<button type="button" data-launch-mode="${key}" aria-pressed="${mode===key}">${label}<span aria-hidden="true">›</span></button>`).join('')}</nav><div class="nsp-launch-calendar"><div class="nsp-launch-year"><button type="button" data-launch-step="-1" aria-label="${mode==='year'?'上一组年份':'上一年'}">«</button><span>${mode==='year'?`${yearStart}年 — ${yearStart+8}年`:`${year}年`}</span><button type="button" data-launch-step="1" aria-label="${mode==='year'?'下一组年份':'下一年'}">»</button></div><div class="nsp-launch-options">${values.map(value=>{
   const selected=nspLaunchSelection&&nspLaunchSelection.mode===mode&&(mode==='year'?nspLaunchSelection.year===value:nspLaunchSelection.year===year&&nspLaunchSelection.value===value);
   const label=mode==='year'?`${value}年`:mode==='quarter'?`第${value}季度`:`${value}月`;
   return `<button type="button" data-launch-value="${value}" aria-pressed="${Boolean(selected)}">${label}</button>`;
  }).join('')}</div></div>`;
  if(panel.matches(':popover-open'))position();
 };
 trigger.onclick=()=>{
  if(panel.matches(':popover-open')){close();return}
  mode=nspLaunchSelection?.mode||'year';year=nspLaunchSelection?.year||new Date().getFullYear();yearStart=Math.max(1,Math.min(9991,2020+Math.floor((year-2020)/9)*9));
  render();panel.showPopover();position();panel.querySelector(`[data-launch-mode="${mode}"]`).focus({preventScroll:true});
 };
 panel.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.launchMode){mode=button.dataset.launchMode;render();panel.querySelector(`[data-launch-mode="${mode}"]`).focus({preventScroll:true})}
  else if(button.dataset.launchStep){const step=Number(button.dataset.launchStep);if(mode==='year')yearStart=Math.max(1,Math.min(9991,yearStart+step*9));else year=Math.max(1,Math.min(9999,year+step));render();panel.querySelector(`[data-launch-step="${step}"]`).focus({preventScroll:true})}
  else if(button.dataset.launchValue){const value=Number(button.dataset.launchValue);apply({mode,year:mode==='year'?value:year,value:mode==='year'?1:value})}
 };
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();trigger.focus({preventScroll:true})}});
 panel.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
 clear.onclick=()=>apply(null);
 // 仅在浮层打开时监听，重绘移除控件时也释放，避免积累全局监听。
 let listeners=null;
 panel.addEventListener('toggle',()=>{
  listeners?.abort();listeners=null;
  if(!panel.matches(':popover-open'))return;
  listeners=new AbortController();
  window.addEventListener('resize',position,{signal:listeners.signal});
  document.addEventListener('scroll',e=>{if(!panel.contains(e.target))position()},{capture:true,signal:listeners.signal});
 });
}
