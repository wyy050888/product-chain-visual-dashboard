// 演示封样评审按人员、链群和完成日期归属，待补档案的项目由已有项目样例提供展示信息。
const pcArchiveReviewSamples=[
 ['张泽昆','环境','2026-11-09',8,[]],
 ['张晓阳','环境','2026-11-16',3,[83]],
 ['姚栋','环境','2026-11-13',2,[91]],
 ['刘萱','环境','2026-11-17',0,[94]],
 ['潘东跃','清洁','2026-11-11',9,[2]],
 ['孟森祥','清洁','2026-11-12',3,[4]],
 ['刘萱','清洁','2026-11-17',1,[]],
 ['侯佳莉','厨电','2026-11-10',7,[13]],
 ['姚栋','厨电','2026-11-13',1,[]],
 ['孟森祥','厨电','2026-11-12',1,[]],
 ['刘萱','厨电','2026-11-17',1,[]],
 ['姚栋','个护&健康','2026-11-13',2,[7]]
];
function pcArchiveReviewTotals(records){
 const linked=targetSum(records.map(([, , ,count])=>count));
 const missing=records.flatMap(([name,chain,date,,ids])=>ids.map(id=>({id,name,chain,date})));
 const reviewed=linked+missing.length;
 return {archive:msRatio(linked,reviewed),reviewed,missing};
}
function pcPersonnelArchiveData(roster,chain,range){
 const {rows,summary}=pcPersonnelSampleData(roster,chain,range,pcPersonnelSamples.system);
 const scope=new Set(rows.map(row=>JSON.stringify([row.name,row.chain])));
 const records=pcArchiveReviewSamples.filter(([name,category,date])=>scope.has(JSON.stringify([name,category]))&&pcWithin(date,range.start,range.end));
 for(const row of rows)Object.assign(row,pcArchiveReviewTotals(records.filter(([name,category])=>name===row.name&&category===row.chain)));
 return {rows,summary:{...summary,...pcArchiveReviewTotals(records)}};
}

const pcArchiveBackground=new Map(),pcArchiveOverlay=$('#overlay');
function pcRestoreArchiveBackground(){dashboardRestoreOffscreen(pcArchiveBackground)}
new MutationObserver(()=>{
 if(pcArchiveOverlay.hidden)pcRestoreArchiveBackground();
}).observe(pcArchiveOverlay,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',pcRestoreArchiveBackground);

function pcOpenArchiveReview({name,chain,reviewed,missing},range){
 const scope=[name==='汇总'?null:name,chain,`${pcRiskDate(range.start)} — ${pcRiskDate(range.end)}`].filter(Boolean).join(' · ');
 const projectById=new Map(sampleProjectSource.map(project=>[project.id,project]));
 const rows=missing.map(row=>({...row,project:projectById.get(row.id).name}));
 if(pcArchiveOverlay.hidden){
  const board=$('#department-view.product-center-view');
  const offscreenCandidates=board.querySelectorAll(':scope > .section,#riskrail [data-rp-board]');
  dashboardMeasureOffscreen(offscreenCandidates,pcArchiveBackground)();
 }
 openModal('未关联产品档案的项目',`<article class="nsp-unsold-drawer pc-archive-drawer">
  <div class="nsp-unsold-toolbar"><input type="search" aria-label="搜索项目名称" placeholder="搜索项目名称"></div>
  <div class="tablewrap nsp-unsold-table"></div><div class="nsp-unsold-pagination"></div>
 </article>`,true,`${scope} · 已完成封样评审 ${reviewed} 个 · 未关联产品档案 ${rows.length} 个`);
 const root=$('#dialogbody .pc-archive-drawer'),search=root.querySelector('input');
 const list=root.querySelector('.nsp-unsold-table'),pager=root.querySelector('.nsp-unsold-pagination');
 const pagerKey='pc-archive-review';
 let page=1;
 const render=()=>{
  const query=search.value.trim().toLocaleLowerCase();
  const visible=rows.filter(row=>row.project.toLocaleLowerCase().includes(query));
  const size=listPageSize(pagerKey),start=(page-1)*size;
  list.innerHTML=table(['项目名称','项目链群','负责人','封样评审完成日期','操作'],visible.slice(start,start+size).map(row=>[
   esc(row.project),esc(row.chain),esc(row.name),pcRiskDate(row.date),`<button type="button" class="link" data-project="${esc(row.id)}">查看项目</button>`
  ]));
  mountListPager(pager,visible.length,page,next=>{page=next;render()},pagerKey);
 };
 search.addEventListener('input',()=>{page=1;render()});
 render();
}
