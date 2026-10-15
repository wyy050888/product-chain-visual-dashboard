

// Director project dates share the AI day-picker presentation and period context.
const pjOriginalControls=periodControls,pjOriginalBounds=bounds,pjOriginalLabel=periodLabel,pjOriginalKey=periodKey,pjOriginalWord=word,pjOriginalChange=changePeriod;
const pjDayMinimum='2025-01-01';
bounds=function(p=periodFor()){
 if(p.mode!=='day')return pjOriginalBounds(p);
 return {first:+p.start.slice(5,7),last:+p.end.slice(5,7),start:p.start,end:p.end,cutoff:p.end,partial:false};
};
periodLabel=function(p=periodFor()){return p.mode==='day'?(p.start===p.end?p.start:p.start+' — '+p.end):pjOriginalLabel(p)};
periodKey=function(p=periodFor()){return p.mode==='day'?'day-'+p.start+'-'+p.end:pjOriginalKey(p)};
word=function(p=periodFor()){return p.mode==='day'?(p.start===p.end?'当日':'期间'):pjOriginalWord(p)};
periodControls=function(id){
 const html=pjOriginalControls(id);
 if(id!=='projects')return html;
 const p=periodFor(id);
 if(p.mode!=='day')return html.replace(/(<div class="period-segment"[^>]*>)/,'$1<button type="button" data-pj-day aria-pressed="false">日</button>');
 return `<div class="period-picker" data-time-scope="projects"><div class="period-segment" role="group" aria-label="项目进度时间粒度"><button type="button" data-pj-day aria-pressed="true">日</button>${[['month','月'],['quarter','季'],['year','年']].map(([v,l])=>`<button type="button" data-time-mode="${v}" aria-pressed="false">${l}</button>`).join('')}</div><div class="ai-day-picker"><div class="period-segment ai-day-options"><button type="button" data-pj-daymode="single" aria-pressed="${p.dayMode!=='range'}">单日</button><button type="button" data-pj-daymode="range" aria-pressed="${p.dayMode==='range'}">日期区间</button></div>${p.dayMode==='range'?`<form id="pj-day-range-form" class="ai-day-range"><label class="ai-date-label">开始<input id="pj-day-start" type="date" aria-label="项目开始日期" min="${pjDayMinimum}" max="${DATA_CUTOFF}" value="${p.start}" required></label><span>至</span><label class="ai-date-label">结束<input id="pj-day-end" type="date" aria-label="项目结束日期" min="${pjDayMinimum}" max="${DATA_CUTOFF}" value="${p.end}" required></label><button type="submit" class="btn small">应用</button><span id="pj-day-error" class="red" role="alert"></span></form>`:`<label class="ai-date-label">日期<input id="pj-date" type="date" aria-label="项目日期" min="${pjDayMinimum}" max="${DATA_CUTOFF}" value="${p.end}" required></label>`}</div><button class="follow-time" data-time-follow>↶ 恢复跟随</button></div>`;
};
changePeriod=function(id,field,value){
 if(id==='projects'&&periodFor(id).mode==='day'&&field==='mode'){
  const p=periodFor(id);localPeriods[id]={mode:'month',year:+p.end.slice(0,4),value:+p.end.slice(5,7)};
 }
 return pjOriginalChange(id,field,value);
};
function pjApplyDates(start,end,dayMode){
 const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&iso(new Date(v+'T00:00:00Z'))===v;
 if(!valid(start)||!valid(end)||start<pjDayMinimum||end>DATA_CUTOFF||start>end)return false;
 localPeriods.projects={mode:'day',year:+end.slice(0,4),value:+end.slice(5,7),dayMode,start,end};
 projectPage=1;renderTimeControls();renderModule('projects');return true;
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-pj-day]')){const p=periodFor('projects');if(p.mode!=='day'){const end=bounds(p).cutoff;pjApplyDates(end,end,'single')}}
 const mode=e.target.closest('[data-pj-daymode]');if(mode){const p=periodFor('projects');pjApplyDates(mode.dataset.pjDaymode==='single'?p.end:p.start,p.end,mode.dataset.pjDaymode)}
});
document.addEventListener('change',e=>{if(e.target.id==='pj-date'){const input=e.target;if(!pjApplyDates(input.value,input.value,'single')){input.setCustomValidity('请选择有效日期，且不晚于数据截止日');input.reportValidity()}else input.setCustomValidity('')}});
document.addEventListener('submit',e=>{if(e.target.id!=='pj-day-range-form')return;e.preventDefault();if(!pjApplyDates($('#pj-day-start').value,$('#pj-day-end').value,'range'))$('#pj-day-error').textContent='请选择有效区间，开始日期不能晚于结束日期。'});