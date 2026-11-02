
// 全局日期统一取北京时间；每次加载按当天建立近30天默认范围。
const dashboardDateFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'});
function dashboardToday(){return dashboardDateFormatter.format(new Date())}
let DATA_CUTOFF=dashboardToday();
// 日历每次打开或应用快捷项都刷新，常驻页面跨午夜也不沿用昨天。
function dashboardSyncDate(){return DATA_CUTOFF=dashboardToday()}
function dashboardYears(ahead=0,selected=+dashboardToday().slice(0,4)){const first=Math.min(2025,selected),last=Math.max(+dashboardToday().slice(0,4)+ahead,selected);return Array.from({length:last-first+1},(_,i)=>first+i)}
function dashboardPeriodLimit(p){const today=dashboardSyncDate();return p.mode==='year'?1:p.year===+today.slice(0,4)?(p.mode==='month'?+today.slice(5,7):Math.ceil(+today.slice(5,7)/3)):(p.mode==='month'?12:4)}
const moduleIds=['risk','ai','sales','new','projects','lifecycle','matrix','inventory','suppliers','cost'];
const moduleNames={risk:'高危预警',ai:'AI 总诊断',sales:'销售达成',projects:'项目进度',lifecycle:'生命周期',new:'新品专项',matrix:'关键产品',inventory:'库存管控',suppliers:'供应链采购',cost:'降本增效'};
let globalPeriod={mode:'month',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7)}, localPeriods={},activeModule=null,modalModule=null;
const copyPeriod=p=>({...p});
function periodFor(id=activeModule||'sales'){
 // 库存固定读取最新样例快照，不受全局回看期间影响。
 if(id==='inventory')return {mode:'month',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7)};
 const p=localPeriods[id]||(['matrix','new'].includes(id)?{mode:'day',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7),start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF}:globalPeriod);
 return p;
}
function word(p=periodFor()){return {recent30:'近30天',month:'月度',quarter:'季度',year:'年度'}[p.mode]}
// 达成展示使用具体周期；通用口径说明仍使用月度/季度/年度。
function periodShortText(p=periodFor()){if(p.mode==='recent30')return '近30天';if(p.mode==='day')return p.end===DATA_CUTOFF&&p.start===shiftDate(p.end,-29)?'近30天':p.start===p.end?'当日':'所选期间';return p.mode==='year'?String(p.year).slice(-2)+'年':p.mode==='quarter'?'Q'+p.value:p.value+'月'}
function periodKey(p=periodFor()){return [p.year,p.mode,p.value].join('-')}
function periodLabel(p=periodFor()){if(p.mode==='recent30')return '近30天';return p.year+' 年'+(p.mode==='year'?'全年':p.mode==='quarter'?' · Q'+p.value:' · '+p.value+' 月')}
function iso(d){return d.toISOString().slice(0,10)}
function bounds(p=periodFor()){
 if(p.mode==='recent30'){
  const start=shiftDate(DATA_CUTOFF,-29);
  return {first:+start.slice(5,7),last:+DATA_CUTOFF.slice(5,7),start,end:DATA_CUTOFF,cutoff:DATA_CUTOFF,partial:false};
 }
 const first=p.mode==='year'?1:p.mode==='quarter'?(p.value-1)*3+1:p.value;
 const last=p.mode==='year'?12:p.mode==='quarter'?p.value*3:p.value;
 const start=iso(new Date(Date.UTC(p.year,first-1,1))),end=iso(new Date(Date.UTC(p.year,last,0))),cutoff=end<DATA_CUTOFF?end:DATA_CUTOFF;
 return {first,last,start,end,cutoff,partial:end>DATA_CUTOFF};
}
// 历史趋势含截止日所在期，共24期；当周/当月只累计到截止日。
function recentTrendRange(start,end,mode){
 if(mode==='month')return {start:riskMonthShift(end.slice(0,7),-23)+'-01',end};
 if(mode==='week')return {start:shiftDate(end,-((new Date(end+'T00:00:00Z').getUTCDay()+6)%7)-23*7),end};
 return {start,end};
}
function months(p=periodFor(),ytd=false){const b=bounds(p),last=+b.cutoff.slice(5,7);return Array.from({length:Math.max(0,Math.min(last,b.last)-(ytd?1:b.first)+1)},(_,i)=>(ytd?1:b.first)+i)}
function withPeriod(id,fn){const old=activeModule,q=quarter;activeModule=id;quarter=Math.ceil(+bounds(periodFor(id)).cutoff.slice(5,7)/3);try{return fn()}finally{activeModule=old;quarter=q}}
const shiftedDates=boundedCache(4096);
function shiftDate(date,n){const key=date+'|'+n,cached=shiftedDates.get(key);if(cached!==undefined)return cached;const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return shiftedDates.set(key,iso(d));}
function dateBack(n){return shiftDate(bounds().cutoff,-n)}
function snapshotFactor(p=periodFor()){const b=bounds(p);return +(0.70+(p.year-2025)*.12+(+b.cutoff.slice(5,7))*.02).toFixed(3)}
// 筛选区仅展示实际统计范围，业务口径由对应指标提示承载。
function periodDescription(id){
 if(id==='inventory')return '';
 const b=bounds(periodFor(id));
 return `<span class="period-range">${b.start} — ${b.cutoff}</span>`;
}
function periodControls(id,options={}){
 if(id==='inventory'&&!options.period)return '';
 const p=options.period||(id==='global'?globalPeriod:periodFor(id)),follow=!localPeriods[id],label=options.label||(id==='global'?'全局':moduleNames[id]);
 const recent=p.mode==='recent30',limit=dashboardPeriodLimit(p);
 const modes=[...(['matrix','new'].includes(id)?[['day','日']]:[]),['month','月'],['quarter','季'],['year','年']];
 const segment=`<div class="period-segment" role="group" aria-label="${label}时间粒度">${modes.map(([mode,name])=>`<button type="button" data-time-mode="${mode}" aria-pressed="${p.mode===mode}">${name}</button>`).join('')}</div>`;
 const year=recent?'':`<select data-time-year aria-label="${label}年份">${dashboardYears(0,p.year).reverse().map(year=>`<option value="${year}" ${p.year===year?'selected':''}>${year} 年</option>`).join('')}</select>`;
 const value=recent||p.mode==='year'?'':`<select data-time-value aria-label="${label}${p.mode==='month'?'月份':'季度'}">${Array.from({length:limit},(_,i)=>`<option value="${i+1}" ${p.value===i+1?'selected':''}>${p.mode==='month'?(i+1)+' 月':'Q'+(i+1)}</option>`).join('')}</select>`;
 const followControl=options.follow===false||id==='global'||recent?'':`<button class="follow-time ${follow?'following':''}" data-time-follow ${follow?'disabled':''}>${follow?'↗ 跟随全局':'↶ 恢复跟随'}</button>`;
 return `<div class="period-picker" data-time-scope="${id}">${segment}${year}${value}${followControl}</div>`;
}
function renderTimeControls(scope=null){
 if(!scope)$('#globaltime').innerHTML=periodControls('global');
 const independent=Object.keys(localPeriods).length;
 $('#globaltimehint').textContent=`统一统计周期 · ${periodLabel(globalPeriod)} · ${independent?independent+' 个模块独立筛选':'全部模块跟随全局'} · 演示数据截至 ${DATA_CUTOFF}`;
 for(const id of scope?[scope]:moduleIds){if(id==='ai')continue;if(id==='risk'&&typeof rpUsesBoardPeriods==='function'&&rpUsesBoardPeriods()){rpClearSharedDateControls();continue}$('#time-'+id).innerHTML=periodControls(id);$('#time-note-'+id).innerHTML=periodDescription(id)}
}
function normalizePeriod(p){if(p.mode==='recent30')return Object.assign(p,{year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7)});p.year=Number(p.year);p.value=Number(p.value)||1;const max=dashboardPeriodLimit(p);p.value=Math.min(max,Math.max(1,p.value));return p}
function changePeriod(id,field,value){const p=copyPeriod(id==='global'?globalPeriod:periodFor(id));if(field==='mode'){const month=p.mode==='month'?p.value:p.mode==='quarter'?p.value*3:(p.year===+DATA_CUTOFF.slice(0,4)?+DATA_CUTOFF.slice(5,7):12);p.mode=value;p.value=value==='month'?month:value==='quarter'?Math.ceil(month/3):1}else p[field]=+value;normalizePeriod(p);if(id==='global')globalPeriod=p;else localPeriods[id]=p;projectPage=1;if(id==='global')renderAll();else{renderTimeControls(id);renderModule(id)};}
function periodWording(text,p=periodFor()){return text.replaceAll('本季度',p.mode==='month'?'本月':p.mode==='year'?'本年度':'本季度').replaceAll('季度',word(p))}
const originalPeriodLabels=new WeakMap();
function updateLabels(root,id){const p=periodFor(id);if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const nodes=[];while(n=walker.nextNode())nodes.push(n);for(const node of nodes){if(node.parentElement.closest('.period-picker,.period-note,.notice,.period,.scp-workspace,.cc-workspace'))continue;if(!originalPeriodLabels.has(node))originalPeriodLabels.set(node,node.textContent);const text=periodWording(originalPeriodLabels.get(node),p);if(node.textContent!==text)node.textContent=text}root.querySelectorAll('svg[aria-label]').forEach(n=>{if(!n.dataset.originalLabel)n.dataset.originalLabel=n.getAttribute('aria-label');const label=periodWording(n.dataset.originalLabel,p);if(n.getAttribute('aria-label')!==label)n.setAttribute('aria-label',label)})}
function decorateModule(id){if(id==='ai')return;const p=periodFor(id),b=bounds(p);const titles={sales:periodShortText(p)+'销售达成管控'};if(titles[id])$('#'+id+' h2').textContent=titles[id];$('#'+id).querySelectorAll('.period').forEach(n=>n.textContent=periodLabel(p));if(id==='risk')$('#snapshot').textContent='风险快照 '+b.cutoff+' 09:00';if(id==='ai')$('#aitime').textContent='复盘期间 '+b.start+' — '+b.cutoff;updateLabels($('#'+id),id);}
function renderModule(id){const f={risk:renderRisks,ai:renderAI,sales:renderSales,projects:renderProjects,lifecycle:renderLife,new:renderNew,matrix:renderMatrix,inventory:renderInventory,suppliers:renderSuppliers,cost:renderCost}[id];f()}
