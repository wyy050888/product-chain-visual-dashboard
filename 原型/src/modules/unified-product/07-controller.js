// 每层抽屉持有独立日期与筛选；待办草稿由任务模块按稳定ID保留。
function upMountTable(host,pager,headers,rows,empty='暂无数据') {
  let page=1;
  const fill=()=>{const pages=Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE));page=Math.min(page,pages);
    host.innerHTML=rows.length?table(headers,rows.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE)):`<div class="up-empty">${empty}</div>`;
    mountListPager(pager,rows.length,page,next=>{page=next;fill()});
  };fill();
}
function upOpenDetail(context) {
  const product=upSpus.get(context.spuId); if(!product){toast('未找到对应SPU，不能以型号或项目记录替代');return}
  const state={platform:'all',tab:'operating',...context}, base=upProduct(product);
  const inheritedPlatforms=Array.isArray(state.platform)?[...state.platform]:null;
  const identity=pfIdentity(base),attributeTags=rpQualityProductFields(base).find(field=>field.key==='productType').tags;
  if(!state.period||upWindow(state.period).start!==state.start||upWindow(state.period).end!==state.end)state.period=drawerPeriodFromRange(state);
  let model=upDetailModel(state);
  openModal('产品详情',`<article class="up-detail" data-up-spu="${esc(state.spuId)}" data-up-tab="${state.tab}">
    <header class="up-hero" data-product-summary>${riskThumbnail(base.name)}<div><div class="up-product-heading"><h2>${esc(base.name)}</h2>${attributeTags.length?rpProductTagMarkup(attributeTags):''}<button type="button" class="link up-project-link" data-up-project>查看项目</button></div>
      <dl data-up-identity></dl></div>
      <section class="up-ai-summary" aria-label="产品AI总结"></section></header>
    <div class="up-toolbar"><label>平台<select id="up-platform">${inheritedPlatforms?`<option value="selected">所选平台：${esc(inheritedPlatforms.join('、'))}</option>`:''}<option value="all">全平台</option>${qrPlatforms.map(p=>`<option ${p===state.platform?'selected':''}>${p}</option>`).join('')}</select></label></div>
    <section data-up-panel="operating"></section><section data-up-panel="quality"></section><section data-up-panel="stock"></section>
    <section data-up-panel="handling"></section></article>`,true,'');
  const root=$('.up-detail');
  const projectLink=root.querySelector('[data-up-project]');
  if(projectLink)projectLink.onclick=()=>toast('已关联项目时跳转到项目详情页；未关联项目时提示“该产品暂未关联项目”');
  function paint() {
    model=upDetailModel(state);
    const fields=[['SPU码',base.spuCode],['型号',base.model],['品牌',base.brand],['产品链',chains[base.chain]],['季品',identity.attribute]];
    // 上线当天计为第1天，随详情统计截止日更新，与新品列表保持一致。
    if(product.cohort==='new')fields.push(['新品上线日期',base.actualLaunch],['已上线天数',Math.max(0,aiFlowDayDiff(base.actualLaunch,state.end)+1)+' 天']);
    root.querySelector('[data-up-identity]').innerHTML=fields.map(([k,v])=>`<div><dt>${k}${k==='SPU码'?'：':''}</dt><dd>${esc(v||'暂无数据')}</dd></div>`).join('');
    upEnsureTodoSamples(model,state);
    upMountAiSummary(root,model,state);
    root.querySelector('[data-up-panel="operating"]').innerHTML=upOperatingView(model,state);
    root.querySelector('[data-up-panel="quality"]').innerHTML=upQualityView(model,state);
    root.querySelector('[data-up-panel="stock"]').innerHTML=upStockView(model,state);
    root.dataset.upStart=state.start;root.dataset.upEnd=state.end;
    upMountQuality(root,model,state);upMountStock(root,model,state);upMountTodos(root,model,state);
    drawerQueueRefresh();
  }
  const select=root.querySelector('#up-platform');select.value=inheritedPlatforms?'selected':state.platform;
  select.onchange=()=>{state.platform=select.value==='selected'?inheritedPlatforms:select.value;paint()};
  drawerMountDetailPeriod(root,state.period||drawerPeriodFromRange(state),(period,range)=>{
    Object.assign(state,range,{period});paint();
  },'up-date-trigger',['operating','quality']);
  paint();
}
const upPreviousProfile=drawerProfile;
drawerProfile=function(body,title) {
  const root=body.querySelector(':scope > .up-detail');
  if(!root) return upPreviousProfile(body,title);
  return {root,tabs:upTabs,entries:[...root.children].map(node=>({node,key:node.dataset.upPanel||'shared'})),
    activeKey:root.dataset.upTab,onSelect:(key,focus)=>{
      root.dataset.upTab=key;drawerView.key=key;drawerApply();body.scrollTop=0;
      if(key==='quality')upPositionReturnTrend(root);
      if(focus)drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true});
    }};
};
