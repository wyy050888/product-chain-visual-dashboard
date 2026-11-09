// 自然期间沿用现有上线日期算法；日维度补充严格日期校验与双月日历。
function uiPeriodDate(year,month,day){const d=new Date(0);d.setUTCFullYear(year,month-1,day);return d.toISOString().slice(0,10)}
function uiPeriodValidDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
function uiNaturalPeriodRange(selection,maxDate){
 if(!selection)return null;
 const {mode,year,value}=selection;
 let range;
 if(mode==='day'){
  if(!uiPeriodValidDate(selection.start)||!uiPeriodValidDate(selection.end)||selection.start>selection.end)return null;
  range={start:selection.start,end:selection.end};
 }else{
  if(!['year','quarter','month'].includes(mode)||!Number.isInteger(year)||year<1||year>9999||mode==='quarter'&&(!Number.isInteger(value)||value<1||value>4)||mode==='month'&&(!Number.isInteger(value)||value<1||value>12))return null;
  range=nspLaunchRange(mode,year,value);
 }
 if(maxDate&&range.start>maxDate)return null;
 return {...range,end:maxDate&&range.end>maxDate?maxDate:range.end};
}
function uiNaturalPeriodLabel(selection){
 if(!selection)return '全部日期';
 return selection.mode==='day'?(selection.start===selection.end?selection.start:selection.start+' — '+selection.end):nspLaunchLabel(selection);
}
function uiPeriodMonthMarkup(year,month,draft,maxDate){
 const first=uiPeriodDate(year,month,1),offset=new Date(first+'T00:00:00Z').getUTCDay(),count=new Date(uiPeriodDate(year,month+1,0)+'T00:00:00Z').getUTCDate();
 const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
  const day=i-offset+1;if(day<1||day>count)return '<span aria-hidden="true"></span>';
  const date=uiPeriodDate(year,month,day),edge=date===draft.start||date===draft.end,inside=draft.start&&draft.end&&date>draft.start&&date<draft.end;
  return `<button type="button" data-natural-day="${date}" aria-label="${date}" aria-pressed="${Boolean(edge||inside)}" class="${edge?'ui-period-edge':inside?'ui-period-inside':''}" ${maxDate&&date>maxDate?'disabled':''}>${day}</button>`;
 });
 return `<section class="ui-period-month"><h4>${year}年${month}月</h4><div class="ui-period-week" aria-hidden="true">${['日','一','二','三','四','五','六'].map(day=>`<span>${day}</span>`).join('')}</div><div class="ui-period-days">${cells.join('')}</div></section>`;
}
function uiNaturalPeriodMarkup(state,selection,maxDate,allowedModes=['year','quarter','month','day']){
 const {mode,year,month,draft}=state,yearStart=Math.floor(year/10)*10;
 const modes=`<nav class="nsp-launch-modes" aria-label="日期维度">${[['year','自然年'],['quarter','自然季度'],['month','自然月'],['day','自然日']].filter(([key])=>allowedModes.includes(key)).map(([key,label])=>`<button type="button" data-natural-mode="${key}" aria-pressed="${mode===key}">${label}<span aria-hidden="true">›</span></button>`).join('')}</nav>`;
 const header=`<div class="nsp-launch-year"><button type="button" data-natural-year-step="-1" aria-label="${mode==='year'?'上一组年份':'上一年'}">«</button><span>${mode==='year'?yearStart+' 年 - '+(yearStart+9)+' 年':year+'年'}</span><button type="button" data-natural-year-step="1" aria-label="${mode==='year'?'下一组年份':'下一年'}">»</button></div>`;
 if(mode==='day'){
  const next=month===12?{year:year+1,month:1}:{year,month:month+1};
  return modes+`<div class="nsp-launch-calendar">${header}<div class="ui-period-day-area"><button type="button" class="ui-period-prev-month" data-natural-month-step="-1" aria-label="上个月">‹</button><button type="button" class="ui-period-next-month" data-natural-month-step="1" aria-label="下个月">›</button><div class="ui-period-months">${uiPeriodMonthMarkup(year,month,draft,maxDate)}${uiPeriodMonthMarkup(next.year,next.month,draft,maxDate)}</div></div></div>`;
 }
 const values=Array.from({length:mode==='year'?10:mode==='quarter'?4:12},(_,i)=>mode==='year'?yearStart+i:i+1);
 return modes+`<div class="nsp-launch-calendar">${header}<div class="nsp-launch-options">${values.map(value=>{
  const item={mode,year:mode==='year'?value:year,value:mode==='year'?1:value},active=selection?.mode===mode&&selection.year===item.year&&(mode==='year'||selection.value===value);
  return `<button type="button" data-natural-value="${value}" aria-pressed="${Boolean(active)}" ${uiNaturalPeriodRange(item,maxDate)?'':'disabled'}>${mode==='year'?value:mode==='quarter'?'第'+value+'季度':value+'月'}</button>`;
 }).join('')}</div></div>`;
}
