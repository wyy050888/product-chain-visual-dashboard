const pcExpandedLifeChains=new Set();
const pcLifeChevron='<span class="ui-dropdown-icon" aria-hidden="true"></span>';
const pcLifeSelectedTotals=ltSelectedTotals;
ltSelectedTotals=function(stage,p=periodFor('lifecycle')){
 return pcIsActive()&&stage===ltInnovationStage?ltDashboardTotals(stage,p):pcLifeSelectedTotals(stage,p);
};

// 同一份完成事实按品牌计数；当前期是年度累计记录的日期子集。
function pcLifecycleBrandActuals(stage,period,brandsByCategory){
 const plan=ppLifecyclePlans[stage],start=bounds(period).start;
 const records=plan?ppLifecycleCompletedProjects(stage,'year',period):lifecycleCompletionProducts(stage,'year',period);
 const groups=ltCategories.map(()=>new Map());
 for(const record of records){
  const category=ltCategories.indexOf(plan?record.category:chains[record.chain]);
  if(category<0)continue;
  const brand=brandsByCategory[category].includes(record.brand)?record.brand:'';
  const row=groups[category].get(brand)||{actual:0,yearActual:0};
  row.yearActual++;
  if((plan?record[plan.date]:record.date)>=start)row.actual++;
  groups[category].set(brand,row);
 }
 return groups;
}

function pcLifecycleTableRow(row,annual,chain,brand){
 const cells=ltMainCells(row,annual);
 if(brand!==undefined){
  const logo=dashboardBrandLogo(brand,24)||`<span class="pc-life-brand-initial" aria-hidden="true">${esc(brand.charAt(0)||'–')}</span>`;
  cells[0]=`<span class="pc-life-brand-name">${logo}<span>${esc(row.name)}</span></span>`;
 }
 for(const [column,scope] of [[2,'period'],[5,'year']]){
  if(column>=cells.length||brand==='')continue;
  const label=cells[column];
  cells[column]=`<button type="button" class="life-completed-number" data-life-completed="${scope}" data-life-dimension="${chain===null?'summary':'chain'}" data-life-row="${chain??0}"${brand?` data-life-brand="${esc(brand)}"`:''} aria-label="查看${esc(row.name)}${scope==='year'?'年度累计':'本期'}完成，${label}项">${label}<span aria-hidden="true"> ›</span></button>`;
 }
 return cells.map(value=>`<td>${value}</td>`).join('');
}

function pcRenderLifecycleBrands(expandedChains=pcExpandedLifeChains){withPeriod('lifecycle',()=>pcPaintLifecycleBrands(expandedChains))}
function pcPaintLifecycleBrands(expandedChains){
 const table=$('#lifetable table'),head=table?.tHead?.rows[0]?.cells[0],body=table?.tBodies[0];
 if(!head||!body)return;
 const period=periodFor('lifecycle'),annual=period.mode==='year';
 if(lifeIndex===ltInnovationStage){
  const chain=pcChain(),summary=ltDashboardTotals(lifeIndex,period);
  const name=chain===null?'汇总':chains[chain]+'汇总';
  $('#lt-chain-tabs').hidden=true;
  head.textContent='统计范围';
  body.innerHTML=`<tr class="life-summary-row" data-life-summary>${pcLifecycleTableRow({...summary,name},annual,chain)}</tr>`;
  return;
 }
 let toggle=head.querySelector('[data-pc-life-brands]');
 if(!toggle){
  head.innerHTML=`<div class="pc-life-column-head"><span>链群</span><button type="button" class="link ui-icon-label pc-life-brands-toggle" data-pc-life-brands aria-controls="lifetable"><span></span>${pcLifeChevron}</button></div>`;
  toggle=head.querySelector('[data-pc-life-brands]');
 }
 body.querySelectorAll('[data-pc-life-brand-row]').forEach(row=>row.remove());
 const expandedParents=[];
 let visibleChains=0;
 for(const parent of [...body.rows]){
  if(parent.hidden)continue;
  const cell=parent.cells[0],name=cell.textContent.trim();
  const chain=chains.indexOf(name);
  if(chain<0)continue;
  visibleChains++;
  let button=cell.querySelector('[data-pc-life-chain]');
  if(!button){
   cell.innerHTML=`<button type="button" class="ui-icon-label ui-disclosure pc-life-chain-toggle" data-pc-life-chain="${chain}">${pcLifeChevron}<span>${esc(name)}</span></button>`;
   button=cell.firstElementChild;
  }
  const expanded=expandedChains.has(chain);
  button.setAttribute('aria-expanded',String(expanded));
  button.setAttribute('aria-label',`${expanded?'收起':'展开'}${name}品牌`);
  if(expanded)expandedParents.push({parent,chain});
 }
 const allExpanded=visibleChains>0&&expandedParents.length===visibleChains;
 toggle.firstElementChild.textContent=allExpanded?'收起品牌':'展开品牌';
 toggle.setAttribute('aria-expanded',String(allExpanded));
 if(!expandedParents.length)return;
 const brandsByCategory=ltCategories.map((_,category)=>ltBrandsFor(period.year,category));
 const actuals=pcLifecycleBrandActuals(lifeIndex,period,brandsByCategory);
 for(const {parent,chain} of expandedParents){
  const category=ltCategories.indexOf(chains[chain]),counts=actuals[category];
  const brands=counts.has('')?[...brandsByCategory[category],'']:brandsByCategory[category];
  const rows=brands.map(brand=>{
   const target=ltBrandTargetFor(lifeIndex,category,brand,period),yearTarget=ltBrandTargetFor(lifeIndex,category,brand,period,true);
   const metrics=counts.get(brand)||{actual:0,yearActual:0};
   const row={name:brand||'未归属品牌',...metrics,target:target.value,yearTarget:yearTarget.value,targetMeta:target,yearTargetMeta:yearTarget};
   return `<tr data-pc-life-brand-row data-chain="${chain}" data-brand="${esc(brand)}" aria-label="${esc(chains[chain])} · ${esc(row.name)}">${pcLifecycleTableRow(row,annual,chain,brand)}</tr>`;
  });
  parent.insertAdjacentHTML('afterend',rows.join(''));
 }
}

function pcToggleLifecycleBrands(button,expandedChains=pcExpandedLifeChains){
 const expanded=button.getAttribute('aria-expanded')==='true';
 const controls=button.hasAttribute('data-pc-life-brands')?$$('#lifetable [data-pc-life-chain]'):[button];
 for(const control of controls){
  const chain=Number(control.dataset.pcLifeChain);
  if(expanded)expandedChains.delete(chain);
  else expandedChains.add(chain);
 }
 pcRenderLifecycleBrands(expandedChains);
}

dpView.addEventListener('click',event=>{
 const button=event.target.closest('[data-pc-life-chain],[data-pc-life-brands]');
 if(!button||!pcIsActive())return;
 pcToggleLifecycleBrands(button);
 pcQueueNavigation();
});
