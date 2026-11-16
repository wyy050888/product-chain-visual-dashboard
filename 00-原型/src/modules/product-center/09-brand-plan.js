// 品牌计划读取项目排期；链群生命周期目标不向品牌拆分。
const pcBrandPlan={chain:0,brand:''};
function pcRenderBrandPlan(){
 const section=$('#lifecycle'),period=periodFor('lifecycle'),range=bounds(period),scope=ltChainScope();
 const fixed=pcChain()??(scope==='all'?null:Number(scope)),chain=fixed??pcBrandPlan.chain;
 let panel=$('#pc-brand-plan');
 if(!panel){panel=document.createElement('section');panel.id='pc-brand-plan';panel.className='pc-panel pc-brand-plan';section.append(panel)}
 const projects=pcPlanProjects(period).filter(row=>row.chain===chain&&row.brand&&row.brand!=='—'&&pcProjectTypes.some(([key])=>key===ppProjectType(row.type)));
 const brands=[...new Set(projects.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,'zh'));
 const planned=projects.filter(row=>pcWithin(ppLatestPlan(row),range.start,range.end));
 const brand=brands.includes(pcBrandPlan.brand)?pcBrandPlan.brand:planned[0]?.brand||brands[0]||'';
 const records=planned.filter(row=>row.brand===brand).sort((a,b)=>ppLatestPlan(a).localeCompare(ppLatestPlan(b)));
 const completed=row=>!!ppDate(row.actual)&&row.actual<=range.cutoff;
 const count=(label,value)=>`<div><span>${label}</span><strong>${fmt(value)}</strong></div>`;
 panel.innerHTML=`<div class="pc-people-toolbar"><div><h3>链群品牌上品计划</h3><p class="muted">${range.start} 至 ${range.end} · 按项目台账最新计划量产日期统计</p></div>
  <div class="pc-brand-filters">${fixed===null?`<label>链群 <select id="pc-plan-chain">${chains.map((name,index)=>`<option value="${index}" ${chain===index?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`:`<span>${esc(chains[chain])}</span>`}
  <label>品牌 <select id="pc-plan-brand" ${brands.length?'':'disabled'}>${brands.length?brands.map(name=>`<option ${name===brand?'selected':''}>${esc(name)}</option>`).join(''):'<option>暂无品牌</option>'}</select></label></div></div>
  <div class="pc-brand-counts">${count('计划项目',records.length)}${count('截至统计日已完成',records.filter(completed).length)}${count('尚未完成',records.filter(row=>!completed(row)).length)}</div>
  ${pcMetricTable('品牌上品计划明细',[['项目'],['项目类型'],['计划量产日期'],['实际完成日期'],['产品负责人']],records.map(row=>[row.name,pcProjectTypes.find(([key])=>key===ppProjectType(row.type))[1],ppLatestPlan(row),completed(row)?row.actual:null,row.productOwner||null]))}`;
}
dpView.addEventListener('change',event=>{
 const input=event.target;
 if(!pcIsActive()||!['pc-plan-chain','pc-plan-brand'].includes(input.id))return;
 if(input.id==='pc-plan-chain'){pcBrandPlan.chain=+input.value;pcBrandPlan.brand=''}
 else pcBrandPlan.brand=input.value;
 pcRenderBrandPlan();document.getElementById(input.id)?.focus({preventScroll:true});pcQueueNavigation();
});
