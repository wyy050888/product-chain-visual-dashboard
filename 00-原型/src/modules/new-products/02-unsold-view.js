function nspUnsoldKpi(count){
 return `<div class="newmetric nsp-unsold-kpi">
  <span>已提货未销售</span>
  <strong class="num"><button type="button" data-nsp-unsold aria-haspopup="dialog" aria-label="已提货未销售 ${count} 个，查看明细">${count}</button><span class="unit"> 个</span></strong>
 </div>`;
}

function nspOpenUnsold({asOf,rows}){
 const projectHeaders=[['计划上市日期','计划完成日期'],['承接运营','承接运营']].map(([label,field])=>
  `${label} <span class="metric-help" role="button" tabindex="0" aria-label="查看${label}指标口径" data-metric-rule="取数口径：取自 SPU 关联项目的${field}。"></span>`
 );
 const headers=['产品信息','首批请购单号','首批单状态','我司可售库存',...projectHeaders,'产品经理'];
 openModal('已提货未销售',`<article class="nsp-unsold-drawer">
  <p class="nsp-unsold-notice" data-preserve-terms>已下首批请购单，并<strong>已完成部分/全部交付后，未检测到渠道首个订单的产品清单</strong></p>
  <div class="nsp-unsold-toolbar">
   <input type="search" aria-label="搜索产品名称或SPU编码" placeholder="搜索产品名称 / SPU编码">
  </div>
  <div class="tablewrap nsp-unsold-table"></div>
  <div class="nsp-unsold-pagination"></div>
 </article>`,true,`数据截至 ${asOf}`);
 const root=$('#dialogbody .nsp-unsold-drawer');
 const search=root.querySelector('input');
 const tableHost=root.querySelector('.nsp-unsold-table');
 const pager=root.querySelector('.nsp-unsold-pagination');
 let page=1;
 const render=()=>{
  const query=search.value.trim().toLocaleLowerCase();
  const visible=rows.filter(product=>[product.name,product.spuCode].some(value=>value.toLocaleLowerCase().includes(query)));
  const size=listPageSize(pager);
  const start=(page-1)*size;
  tableHost.innerHTML=table(headers,visible.slice(start,start+size).map(product=>[
   `<div class="prodname">${riskThumbnail(product.imageFrom)}<div><strong>${esc(product.name)}</strong><small>SPU码：${esc(product.spuCode)}</small></div></div>`,
   esc(product.requisitionNo),
   `<span class="nsp-requisition-status" data-status="${esc(product.firstRequisitionStatus)}">${esc(product.firstRequisitionStatus)}</span>`,
   `${product.stock.toLocaleString('zh-CN')} 件`,
   esc(product.plannedLaunch||'—'),
   esc(product.operationsOwner||'—'),
   esc(product.manager||'—')
  ]));
  for(const help of tableHost.querySelectorAll('th > .metric-help')){
   help.parentElement.dataset.metricOriginalRule=help.dataset.metricRule;
  }
  mountListPager(pager,visible.length,page,next=>{page=next;render()});
 };
 search.addEventListener('input',()=>{page=1;render()});
 render();
}

const nspUnsoldPreviousProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.nsp-unsold-drawer');
 if(!root)return nspUnsoldPreviousProfile(body,title);
 return {root,entries:[{node:root,key:'shared'}],tabs:[]};
};
