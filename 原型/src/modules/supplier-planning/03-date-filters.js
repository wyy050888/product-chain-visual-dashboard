// 业务日期复用全局双月日历；只有新增带起始日，累计只限制截止日。
const scpMemberDateFields=[['registered','注册日期'],['reserved','储备日期'],['admitted','准入日期'],['cooperation','合作日期']];
const scpToday=dashboardToday;
function scpMemberDateDefaults(metric,range){
 const dates=Object.fromEntries(scpMemberDateFields.map(([key])=>[key,{from:'',to:''}]));
 const key={reserved:'reserved',admitted:'admitted',newAdmitted:'admitted',cooperated:'cooperation',newCooperation:'cooperation'}[metric];
 if(key&&range){
  const today=scpToday(),end=range.future?range.end:range.end<today?range.end:today;
  dates[key]={from:metric.startsWith('new')||range.future?range.start:'',to:end};
 }
 return dates;
}
function scpMemberDatesMatch(supplier,dates){
 return scpMemberDateFields.every(([key])=>{
  const {from,to}=dates[key],date=key==='registered'?supplier.registered:supplier.scopeDates[key];
  return !from&&!to||!!date&&(!from||date>=from)&&(!to||date<=to);
 });
}
function scpMemberDateFilters(state){
 const short=date=>date?date.slice(2).replaceAll('-','/'):'',icon='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg>';
 return scpMemberDateFields.map(([key,label])=>{
  const {from,to}=state.dates[key],active=!!(from||to),text=(from||'不限开始')+' — '+(to||'不限结束');
  return `<div class="unified-input-group scp-date-field" data-scp-date="${key}"><span class="unified-field-name">${label}</span><button type="button" class="risk-date-trigger scp-date-trigger ${active?'ui-filter-active':''}" data-scp-date-open="${key}" aria-label="${label}筛选：${esc(text)}" aria-haspopup="dialog" aria-expanded="false" aria-controls="up-date-popover"><span class="${from?'':'muted'}">${short(from)||'开始日期'}</span><span class="muted">—</span><span class="${to?'':'muted'}">${short(to)||'结束日期'}</span>${icon}</button>${active?`<button type="button" class="scp-date-clear" data-scp-date-clear="${key}" aria-label="清除${label}">×</button>`:''}<input type="hidden" data-scp-date-from value="${from}"><input type="hidden" data-scp-date-to value="${to}"></div>`;
 }).join('');
}
function scpOpenMemberDate(trigger,state,apply){
 const key=trigger.dataset.scpDateOpen,date=state.dates[key],label=scpMemberDateFields.find(([field])=>field===key)[1];
 upOpenCalendar(trigger,{start:date.from,end:date.to},(from,to)=>apply(key,{from,to}),{
  min:'2000-01-01',max:()=>{const current=scpToday();return date.to>current?date.to:current},clearable:true,label:'选择'+label+'范围',presets:dateRangePresets
 });
}
