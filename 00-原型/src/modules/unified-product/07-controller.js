// 每层详情抽屉持有独立日期与筛选，仅接受当前可见页签。
function upMountTable(host,pager,headers,rows,empty='暂无数据') {
  let page=1;
  const fill=()=>{const pages=Math.max(1,Math.ceil(rows.length/listPageSize(pager)));page=Math.min(page,pages);
    host.innerHTML=rows.length?table(headers,rows.slice((page-1)*listPageSize(pager),page*listPageSize(pager))):`<div class="up-empty">${empty}</div>`;
    mountListPager(pager,rows.length,page,next=>{page=next;fill()});
  };fill();
}
function upOpenDetail(context) {
  const product=upSpus.get(context.spuId); if(!product){toast('未找到对应SPU，不能以型号或项目记录替代');return}
  const state={platform:'all',tab:'operating',channelSort:{key:'gsvCents',direction:'desc'},...context}, base=upProduct(product);
  if(!upTabs.some(tab=>tab.key===state.tab))state.tab='operating';
  const inheritedPlatforms=Array.isArray(state.platform)?[...state.platform]:null;
  const identity=pfIdentity(base),attributeTags=rpQualityProductFields(base).find(field=>field.key==='productType').tags;
  if(!state.period||upWindow(state.period).start!==state.start||upWindow(state.period).end!==state.end)state.period=drawerPeriodFromRange(state);
  // 品质退货独立记忆单渠道，不改变业绩表现的汇总/渠道选择。
  const qualityPlatforms=Array.isArray(state.platform)?state.platform:qrPlatforms;
  const qualityPlatform=qrPlatforms.includes(state.platform)?state.platform:qualityPlatforms.find(name=>qrPlatforms.includes(name)&&upSummary(product,state.start,state.end,name).sales>0)||qualityPlatforms[0];
  const qualityState={...state,tab:'quality',platform:qualityPlatform};
  openModal('产品详情',`<article class="up-detail" data-up-spu="${esc(state.spuId)}" data-up-tab="${state.tab}">
    <header class="up-hero" data-product-summary>${riskThumbnail(base.name)}<div><div class="up-product-heading"><h2>${esc(base.name)}</h2>${upProductGradeBadge(null)}${attributeTags.length?rpProductTagMarkup(attributeTags):''}<button type="button" class="link up-project-link" data-up-project>查看项目</button></div>
      <div class="up-identity-row"><dl data-up-identity></dl><div class="up-guide-price"><span>指导价：</span><strong data-up-guide-price>${Number.isFinite(base.guidePriceCents)?(base.guidePriceCents/100).toFixed(2):'—'}</strong>${Number.isFinite(base.guidePriceCents)?'<small>元</small>':''}</div></div></div>
      <section class="up-ai-summary" aria-label="产品AI总结"></section></header>
    <div class="up-toolbar"><label>平台<select id="up-platform">${inheritedPlatforms?`<option value="selected">所选平台：${esc(inheritedPlatforms.join('、'))}</option>`:''}<option value="all">全平台</option>${qrPlatforms.map(p=>`<option ${p===state.platform?'selected':''}>${p}</option>`).join('')}</select></label></div>
    <section data-up-panel="operating"></section><section data-up-panel="quality"></section><section data-up-panel="stock"></section>
    </article>`,true,'');
  const root=$('.up-detail');
  const projectLink=root.querySelector('[data-up-project]');
  if(projectLink)projectLink.onclick=()=>toast('已关联项目时跳转到项目详情页；未关联项目时提示“该产品暂未关联项目”');
  function paint() {
    Object.assign(qualityState,{start:state.start,end:state.end,period:state.period});
    const [model,qualityModel]=pfWithCompanyStockBatch(()=>[upDetailModel(state),upDetailModel(qualityState)]);
    const gradeMode=state.period?.mode==='recent30'?'recent30':upGradeTrendPeriod(state).mode,gradeStart=state.period?.mode==='day'?kpmGradeWindow(state.end,'month').start:state.start;
    root.querySelector('[data-up-product-grade]').outerHTML=upProductGradeBadge(kpmGradeAssessment(product,state.end,'all',gradeMode,gradeStart).level);
    const fields=[['SPU码',base.spuCode],['型号',base.model],['品牌',base.brand],['链群',identity.category],['季品',identity.attribute]];
    // 上线当天计为第1天，随详情统计截止日更新，与新品列表保持一致。
    if(product.cohort==='new')fields.push(['新品上线日期',base.actualLaunch],['已上线天数',Math.max(0,aiFlowDayDiff(base.actualLaunch,state.end)+1)+' 天']);
    root.querySelector('[data-up-identity]').innerHTML=fields.map(([k,v])=>`<div><dt>${k}${k==='SPU码'?'：':''}</dt><dd>${esc(v||'暂无数据')}</dd></div>`).join('');
    upMountAiSummary(root,model,state);
    root.querySelector('[data-up-panel="operating"]').innerHTML=upOperatingView(model,state);
    root.querySelector('[data-up-panel="quality"]').innerHTML=upQualityView(qualityModel,qualityState);
    root.querySelector('[data-up-panel="stock"]').innerHTML=upStockView(model,state);
    root.dataset.upStart=state.start;root.dataset.upEnd=state.end;
    upMountOperating(root,model,state);upMountQuality(root,qualityModel,qualityState,paint);upMountStock(root,model,state);upMountStockPeriod(root,model,state);
    drawerQueueRefresh();
  }
  const select=root.querySelector('#up-platform');select.value=inheritedPlatforms?'selected':state.platform;
  select.onchange=()=>{state.platform=select.value==='selected'?inheritedPlatforms:select.value;paint()};
  drawerMountDetailPeriod(root,state.period||drawerPeriodFromRange(state),(period,range)=>{
    Object.assign(state,range,{period});paint();
  },'up-date-trigger',['operating','quality']);
  const stockPeriod=document.createElement('div');stockPeriod.className='up-stock-period';stockPeriod.dataset.upStockPeriod='true';
  root.querySelector(':scope > .up-detail-tabs').append(stockPeriod);
  paint();
}
const upPreviousProfile=drawerProfile;
drawerProfile=function(body,title) {
  const root=body.querySelector(':scope > .up-detail');
  if(!root) return upPreviousProfile(body,title);
  return {root,tabs:upTabs,entries:[...root.children].map(node=>({node,key:node.dataset.upPanel||'shared'})),
    activeKey:root.dataset.upTab,onSelect:(key,focus)=>{
      if(!upTabs.some(tab=>tab.key===key))return;
      root.dataset.upTab=key;drawerView.key=key;drawerApply();body.scrollTop=0;
      const stockPeriod=root.querySelector('[data-up-stock-period]');if(stockPeriod)stockPeriod.hidden=key!=='stock';
      if(key==='quality')upPositionReturnTrend(root);
      if(focus)drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true});
    }};
};
