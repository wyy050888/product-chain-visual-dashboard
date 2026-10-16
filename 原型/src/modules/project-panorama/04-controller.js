// 主管看板使用新版；采购组件的隐藏克隆继续走原组件，避免跨工作台状态串扰。
const ppLegacyRender=renderProjects,ppMainSection=$('#projects');
function ppMount(){
 const section=$('#projects');if(section.querySelector('#pp-layout'))return;
 section.classList.add('pp-main');
 for(const child of section.children)if(!child.classList.contains('sectionhead'))child.classList.add('pp-legacy');
 section.querySelector('.titlegroup .sub')?.classList.add('pp-legacy');
 section.insertAdjacentHTML('beforeend','<div id="pp-layout" class="pp-layout"><aside id="pp-overview" aria-label="项目概览"></aside><div class="pp-main-table"><div id="pp-filters" class="pp-filters"></div><div id="pp-table-scroll" class="pp-table-scroll" tabindex="0" aria-label="项目明细，可横向滚动"></div><div id="pp-pages" class="pp-pages"></div></div></div><div id="pp-ai" class="pp-ai"></div>');
}
function ppRender(){
 ppMount();const all=ppRows(),scope=ppScope(all);
 $('#pp-overview').innerHTML=ppOverview(scope);ppBindEventPeriod();
 $('#pp-filters').innerHTML=ppToolbar(scope);
 decorateFilterFields($('#pp-filters'));
 ppBindPlan('plan');ppBindPlan('actual');ppBindPlan('started');ppTable(scope);
}
renderProjects=function(...args){
 const section=$('#projects');
 if(section!==ppMainSection){section.classList.remove('pp-main');section.querySelectorAll('#pp-layout,#pp-ai,.pp-snapshot-help').forEach(n=>n.remove());section.querySelectorAll('.pp-legacy').forEach(n=>n.classList.remove('pp-legacy'));return ppLegacyRender(...args)}
 return withPeriod('projects',ppRender);
};
function ppRefreshTable(){withPeriod('projects',()=>ppTable(ppScope(ppRows())))}
function ppBindPlan(key){
 const panel=$('#pp-'+key+'-panel'),trigger=$('#pp-filters [aria-controls="pp-'+key+'-panel"]');let mode=ppState[key]?.mode==='range'?'month':ppState[key]?.mode||'year',year=ppState[key]?.year||new Date().getFullYear();
 const position=()=>{const r=trigger.getBoundingClientRect(),b=panel.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(r.left,innerWidth-b.width-8))+'px';panel.style.top=Math.max(8,r.bottom+8+b.height>innerHeight?r.top-b.height-8:r.bottom+8)+'px'};
 const paint=()=>{const first=year-4,values=Array.from({length:mode==='year'?9:mode==='quarter'?4:12},(_,i)=>mode==='year'?first+i:i+1);
  panel.innerHTML=`<nav class="nsp-launch-modes">${[['year','自然年'],['quarter','自然季度'],['month','自然月']].map(([key,label])=>`<button type="button" data-pp-plan-mode="${key}" aria-pressed="${mode===key}">${label}<span>›</span></button>`).join('')}</nav><div class="nsp-launch-calendar"><div class="nsp-launch-year"><button type="button" data-pp-plan-step="-1" aria-label="上一年">«</button><span>${mode==='year'?first+'年 — '+(first+8)+'年':year+'年'}</span><button type="button" data-pp-plan-step="1" aria-label="下一年">»</button></div><div class="nsp-launch-options">${values.map(v=>`<button type="button" data-pp-plan-value="${v}">${mode==='year'?v+'年':mode==='quarter'?'第'+v+'季度':v+'月'}</button>`).join('')}</div></div>`;
  if(panel.matches(':popover-open'))position();
 };
 trigger.onclick=()=>{if(panel.matches(':popover-open')){panel.hidePopover();return}paint();panel.showPopover();position()};
 panel.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.ppPlanMode){mode=b.dataset.ppPlanMode;paint()}else if(b.dataset.ppPlanStep){year=Math.max(5,Math.min(9995,year+Number(b.dataset.ppPlanStep)*(mode==='year'?9:1)));paint()}else if(b.dataset.ppPlanValue){const value=Number(b.dataset.ppPlanValue);ppState[key]={mode,year:mode==='year'?value:year,value:mode==='year'?1:value};panel.hidePopover();ppState.page=1;renderProjects()}};
 panel.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
 // 滚动时关闭浮层，避免浮层脱离控件；监听随控件移除而释放。
 let events;panel.addEventListener('toggle',()=>{events?.abort();if(panel.matches(':popover-open')){events=new AbortController();window.addEventListener('resize',position,{signal:events.signal});document.addEventListener('scroll',e=>{if(!panel.contains(e.target))panel.hidePopover()},{capture:true,signal:events.signal})}});
}
document.addEventListener('change',e=>{
 const select=e.target.closest('#projects.pp-main [data-pp-filter]');
 if(select){ppState[select.dataset.ppFilter]=pfSelected(pfControlValue(select));if(select.dataset.ppFilter==='department')ppState.riskDepartment=ppState.department.length===1?ppState.department[0]:'全部';ppState.page=1;if(['category','type'].includes(select.dataset.ppFilter)){ppState.distribution=select.dataset.ppFilter;ppState.link=null;ppState.stage=[];renderProjects()}else if(select.dataset.ppFilter==='projectState'){ppState.link=null;renderProjects()}else if(['light','riskLight','department'].includes(select.dataset.ppFilter)){withPeriod('projects',()=>{$('#pp-overview').innerHTML=ppOverview(ppScope(ppRows()));ppBindEventPeriod()});ppRefreshTable()}else ppRefreshTable()}
});
document.addEventListener('input',e=>{
 const input=e.target.closest('#projects.pp-main [data-pp-search]');if(!input)return;
 ppState.query=input.value;ppState.page=1;ppRefreshTable();
});
document.addEventListener('click',e=>{
 const b=e.target.closest('#projects.pp-main button');if(!b)return;const d=b.dataset;
 if(d.ppSort){ppState.sort={key:d.ppSort,direction:ppState.sort.key===d.ppSort&&ppState.sort.direction==='asc'?'desc':'asc'};ppState.page=1;ppRefreshTable();$('#pp-table-scroll [data-pp-sort="'+d.ppSort+'"]')?.focus({preventScroll:true});return}
 if(d.ppView!==undefined||d.ppProject!==undefined){toast('跳转项目详情');return}
 if(d.ppLedger!==undefined){ppShowLedger(b);return}
 if(d.ppPage){ppState.page=Number(d.ppPage);ppRefreshTable();return}
 if(d.ppEvidence!==undefined){ppState.query='';ppState.link=null;const id=Number(d.ppEvidence);withPeriod('projects',()=>{const rows=ppFiltered(ppScope(ppRows()));ppState.page=Math.floor(rows.findIndex(p=>p.id===id)/10)+1});renderProjects();const trigger=$('#pp-table-scroll [data-pp-ledger="'+id+'"]');if(trigger){trigger.scrollIntoView({block:'nearest',inline:'nearest'});ppShowLedger(trigger)}return}
 if(d.ppDistribution){ppState.distribution=d.ppDistribution;renderProjects();return}
 if(d.ppLink==='light'){ppState.light=ppLightActive(d.value)?[]:ppLightValues(d.value);if(ppState.link?.kind==='light')ppState.link=null;ppState.page=1;renderProjects();return}
 // 分布图单选切换，再次点击当前单选项取消；同步下拉筛选。
 if(['type','category'].includes(d.ppLink)){const key=d.ppLink;ppState[key]=ppState[key].length===1&&ppState[key][0]===d.value?[]:[d.value];ppState.link=null;ppState.stage=[];ppState.page=1;renderProjects();return}
 if(d.ppLink==='departmentRisk'){ppApplyDepartmentRisk(b);return}
 if(d.ppLink){const next={kind:d.ppLink,value:d.value,type:d.type||'',...(d.ppLink==='departmentRisk'?{department:ppState.riskDepartment}:{})};ppState.link=JSON.stringify(ppState.link)===JSON.stringify(next)?null:next;ppState.page=1;renderProjects();return}
 if(d.ppAiDepartment){ppState.link={kind:'department',value:d.ppAiDepartment};ppState.light=['红灯'];ppState.page=1;renderProjects();return}
 if(b.hasAttribute('data-pp-plan-clear')){ppState[d.ppPlanClear]=null;ppState.page=1;renderProjects();return}
 if(b.hasAttribute('data-pp-reset')){for(const key of ['category','type','brand','light','riskLight','stage','department'])ppState[key]=[];ppState.projectState=['进行中'];ppState.query='';ppState.plan=null;ppState.actual=null;ppState.started=null;ppState.link=null;ppState.riskDepartment='全部';ppState.page=1;ppState.sort={key:'plan',direction:'asc'};renderProjects()}
});
window.projectPanoramaAudit=()=>withPeriod('projects',()=>({state:{...ppState},scope:ppScope(ppRows()),filtered:ppFiltered(ppScope(ppRows())),cutoff:bounds().cutoff}));
