function ppRiskEventChart(){
 const range=ppEventRange(),dimension=ppEventState.dimension,groups=ppEventGroups(ppEventRows(),range,dimension);
 const countCell=(g,kind)=>{const rows=g[kind],red=rows.filter(e=>e.risk.light==='红灯').length,yellow=rows.length-red,label=kind==='new'?'新增':'闭环';
  return `<button type="button" class="pp-event-count" data-pp-event-group="${esc(g.key)}" data-kind="${kind}" aria-label="${esc(g.key)}${label}：红灯${red}条，黄灯${yellow}条"><b class="red">${red}</b><span aria-hidden="true">/</span><b class="orange">${yellow}</b></button>`;
 };
 return `<article class="pp-card pp-events"><div class="pp-card-head"><h3>风险新增与闭环</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯</span></div>
 <div class="pp-event-date-control"><button type="button" class="pp-event-period" data-pp-event-period aria-label="风险统计日期筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="pp-event-period-panel"><span>风险统计日期</span><span class="pp-event-date-value">${ppEventState.all?'全部日期':ppEventState.period?uiNaturalPeriodLabel(ppEventState.period):range.start+' — '+range.end}</span><i aria-hidden="true">⌄</i></button><button type="button" class="pp-event-date-clear" data-pp-event-clear aria-label="清空风险统计日期" ${ppEventState.all?'hidden':''}>×</button><div id="pp-event-period-panel" class="nsp-period-panel ui-natural-period" popover="auto" role="dialog" aria-label="选择风险统计日期"></div></div>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-event-dimension="${key}" aria-pressed="${key===dimension}" class="${key===dimension?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-event-table-wrap"><table class="pp-event-table" aria-label="风险新增与闭环统计"><thead><tr><th scope="col">${dimension==='type'?'项目类型':'类目'}</th><th scope="col">新增风险</th><th scope="col">闭环风险</th></tr></thead><tbody>${groups.map(g=>`<tr><th scope="row">${esc(g.key)}</th><td>${countCell(g,'new')}</td><td>${countCell(g,'closed')}</td></tr>`).join('')}</tbody></table></div></article>`;
}
let ppEventPicker=null;
function ppRenderEvents(){withPeriod('projects',()=>{const card=$('#pp-overview .pp-events');if(card){card.outerHTML=ppRiskEventChart();ppBindEventPeriod()}})}
function ppBindEventPeriod(){
 ppEventPicker?.destroy();
 const trigger=$('#pp-overview [data-pp-event-period]'),panel=$('#pp-event-period-panel');if(!trigger||!panel)return;
 ppEventPicker=uiBindNaturalPeriod({trigger,panel,
  getSelection:()=>ppEventState.all?null:ppEventState.period||withPeriod('projects',()=>({mode:'day',year:Number(ppEventRange().start.slice(0,4)),...ppEventRange()})),
  getMaxDate:()=>withPeriod('projects',()=>bounds().cutoff),
  onApply:(period,range)=>{Object.assign(ppEventState,{period,all:false,...range});ppRenderEvents();$('#pp-overview [data-pp-event-period]')?.focus({preventScroll:true})}
 });
}
function ppOpenEventRecords(key,kind){
 const range=withPeriod('projects',ppEventRange),dimension=ppEventState.dimension;
 const events=withPeriod('projects',()=>ppRiskEvents(ppEventRows(),range)).filter(e=>e.project[dimension]===key&&e.kind===kind),label=kind==='new'?'新增':'闭环';
 ppOpenRiskDetail(key+' · '+label+'风险',events,{prefix:range.start+' — '+range.end,emptyText:'该时段暂无风险记录'});
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#projects.pp-main [data-pp-event-dimension],#projects.pp-main [data-pp-event-clear],#projects.pp-main [data-pp-event-group]');if(!button)return;
 if(button.dataset.ppEventDimension){ppEventState.dimension=button.dataset.ppEventDimension;ppRenderEvents()}
 else if(button.hasAttribute('data-pp-event-clear')){Object.assign(ppEventState,{period:null,all:true,start:null,end:null});ppRenderEvents()}
 else ppOpenEventRecords(button.dataset.ppEventGroup,button.dataset.kind);
});
