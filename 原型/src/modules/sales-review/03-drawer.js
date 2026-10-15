// 抽屉状态独立于首页；链群、品牌/渠道、搜索、时间、分页均先筛选完整数据。
function msWithPeriod(period,fn){
 const previous=localPeriods.sales;localPeriods.sales=period;
 try{return withPeriod('sales',fn)}finally{if(previous)localPeriods.sales=previous;else delete localPeriods.sales}
}
function msDrawerTime(p){
 return msWithPeriod(p,()=>periodControls('sales')).replaceAll('data-time-','data-ms-');
}
salesDetail=function(index,view='brand'){
 const state={chain:index>=0?index:-1,view:view==='channel'?'platform':'brand',query:'',page:1,period:copyPeriod(periodFor('sales'))};
 openModal('销售达成明细','<article class="ms-drawer"><header class="ms-drawer-toolbar"><div class="ms-drawer-dimensions" role="tablist" aria-label="销售明细维度">'+[['brand','分品牌'],['platform','分渠道']].map(([key,label])=>'<button type="button" role="tab" data-ms-view="'+key+'" aria-selected="'+(state.view===key)+'" tabindex="'+(state.view===key?0:-1)+'">'+label+'</button>').join('')+'</div><label class="ms-drawer-search"><input type="search" id="ms-search" placeholder="搜索品牌名称" aria-label="搜索品牌名称"></label></header><div id="ms-drawer-table" class="tablewrap"></div><div id="ms-drawer-pages"></div></article>',true,'');
 const root=$('#dialogbody .ms-drawer');
 function fill(){
  msWithPeriod(state.period,()=>{
   const prefix=msPeriodText(),records=msSort(msBreakdown(state.chain,state.view)).filter(r=>r.name.toLocaleLowerCase().includes(state.query.trim().toLocaleLowerCase()));
   state.page=Math.max(1,Math.min(state.page,Math.ceil(records.length/DRAWER_PAGE_SIZE)||1));
   const headers=[state.view==='brand'?'品牌':'渠道','SKU总数','GSV','去退后销量','利润率',prefix+'目标GSV','GSV差额','利润率差额','GSV偏差','规模偏差'];
   const cells=records.slice((state.page-1)*DRAWER_PAGE_SIZE,state.page*DRAWER_PAGE_SIZE).map(r=>[esc(r.name),fmt(r.sku),msMoney(r.sale),fmt(r.netSales),msPercent(r.actualMargin),msMoney(r.target),'<span class="'+msTone(r.gsvDeviation)+'">'+msMoney(r.gap,true)+'</span>','<span class="'+msTone(r.marginGap)+'">'+msDeviation(r.marginGap)+'</span>','<span class="'+msTone(r.gsvDeviation)+'">'+msDeviation(r.gsvDeviation)+'</span>','<span class="'+msTone(r.scaleDeviation)+'">'+msDeviation(r.scaleDeviation)+'</span>']);
   $('#ms-drawer-table').innerHTML=table(headers,cells,'ms-data-table');
   mountListPager($('#ms-drawer-pages'),records.length,state.page,n=>{state.page=n;fill()});
   root.msChainValue=state.chain;
  });
  drawerQueueRefresh();
 }
 root.msSetChain=value=>{state.chain=Number(value);state.page=1;fill()};
 $('#ms-search').oninput=e=>{state.query=e.target.value;state.page=1;fill()};
 const selectView=view=>{
  state.view=view;state.page=1;
  for(const button of root.querySelectorAll('[data-ms-view]')){const active=button.dataset.msView===view;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1}
  const search=$('#ms-search'),label=view==='brand'?'搜索品牌名称':'搜索渠道名称';search.placeholder=label;search.setAttribute('aria-label',label);fill();
 };
 root.onclick=e=>{const button=e.target.closest('[data-ms-view]');if(button)selectView(button.dataset.msView)};
 root.querySelector('.ms-drawer-dimensions').onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
  selectView(e.key==='Home'?'brand':e.key==='End'?'platform':state.view==='brand'?'platform':'brand');root.querySelector('[data-ms-view="'+state.view+'"]').focus();
 };
 const timeHost=$('#dialogsub');
 const renderTime=()=>{
  timeHost.innerHTML=msDrawerTime(state.period);timeHost.querySelector('[data-ms-follow]')?.remove();
  const b=msWithPeriod(state.period,()=>bounds());timeHost.querySelector('.period-picker').insertAdjacentHTML('beforeend','<span class="period-range">'+b.start+' — '+b.cutoff+'</span>');
 };
 timeHost.onclick=e=>{
  const button=e.target.closest('[data-ms-mode]');if(!button)return;
  const mode=button.dataset.msMode,month=state.period.mode==='month'?state.period.value:state.period.mode==='quarter'?(state.period.value-1)*3+1:1;
  state.period=normalizePeriod({...state.period,mode,value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1});state.page=1;renderTime();fill();
 };
 timeHost.onchange=e=>{
  if(e.target.matches('[data-ms-year]'))state.period=normalizePeriod({...state.period,year:Number(e.target.value)});
  else if(e.target.matches('[data-ms-value]'))state.period=normalizePeriod({...state.period,value:Number(e.target.value)});else return;
  state.page=1;renderTime();fill();
 };
 renderTime();root.msChainValue=state.chain;selectView(state.view);
};
const msPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector('.ms-drawer');if(!root)return msPreviousDrawerProfile(body,title);
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs:[{key:'ms-chain--1',label:'公司整体'},...chains.map((label,i)=>({key:'ms-chain-'+i,label}))],activeKey:'ms-chain-'+root.msChainValue,onSelect:key=>root.msSetChain(key.replace('ms-chain-',''))};
};

