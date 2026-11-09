import assert from 'node:assert/strict';
export async function verifyProjectChartHeaders(page){
 await verifyProjectDepartmentControls(page);
 const charts=page.locator('#pp-overview');
 assert.equal(await charts.locator('.pp-card-head .pp-chart-legend').count(),0);
 assert.deepEqual(await charts.locator('.pp-distribution .pp-chart-count-head b').allTextContents(),['高危','红灯','黄灯','绿灯']);
 assert.deepEqual(await charts.locator('.pp-departments .pp-chart-count-head b').allTextContents(),['红灯','黄灯']);
 const initial=await page.evaluate(()=>projectPanoramaAudit().state.distribution);
 for(const dimension of ['category','type']){
  await page.locator('[data-pp-distribution="'+dimension+'"]').click();
  assert.deepEqual(await charts.locator('.pp-chart-columns>span:first-child').allTextContents(),[dimension==='type'?'项目类型':'链群',dimension==='type'?'项目类型':'链群']);
 }
 for(const width of [1920,1440,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  const layout=await charts.evaluate(root=>[...root.children].map(card=>{
   const box=card.getBoundingClientRect(),head=card.querySelector('.pp-chart-columns').getBoundingClientRect();
   const headers=[...card.querySelector('.pp-chart-count-head').children].map(n=>n.getBoundingClientRect());
   const rows=[...card.querySelectorAll('.pp-bars>.pp-link')];
   const titlebar=card.querySelector('.pp-card-head').getBoundingClientRect(),tools=card.querySelector('.pp-card-tools').getBoundingClientRect(),body=card.querySelector('.pp-chart-body').getBoundingClientRect();
   return {titleHeight:titlebar.height,toolsTop:tools.top,bodyTop:body.top,top:box.top,bottom:box.bottom,width:box.width,overflow:card.scrollWidth-card.clientWidth,head:head.height,aligned:rows.every(row=>{
    const counts=[...row.querySelector('.pp-distribution-counts,.pp-risk-counts').children].filter(n=>n.tagName!=='SPAN');
    return counts.every((n,i)=>Math.abs(n.getBoundingClientRect().right-headers[i].right)<2);
   }),rowHeights:rows.map(n=>n.getBoundingClientRect().height),body:card.querySelector('.pp-chart-body').getBoundingClientRect().height};
  }));
  assert(layout.every(card=>Math.abs(card.titleHeight-44)<1),'两边标题栏44px '+width);
  if(width>1200)assert(Math.abs(layout[0].toolsTop-layout[1].toolsTop)<1&&Math.abs(layout[0].bodyTop-layout[1].bodyTop)<1,'两图切换栏和柱图起点对齐 '+width);
  assert(layout.every(card=>card.overflow<=1&&card.aligned),'列头与数字对齐、无溢出 '+width);
  assert(layout.every(card=>Math.abs(card.head-32)<1&&Math.abs(card.body-232)<1&&card.rowHeights.every(h=>Math.abs(h-40)<1)),'列头32px、五行各40px '+width);
  if(width>1200)assert(Math.abs(layout[0].top-layout[1].top)<1&&Math.abs(layout[0].bottom-layout[1].bottom)<1&&Math.abs(layout[0].width-layout[1].width)<1,'两图等宽等高');
 }
 await page.setViewportSize({width:1920,height:1080});
 if(initial!=='type')await page.locator('[data-pp-distribution="'+initial+'"]').click();
}

export async function verifyProjectDepartmentControls(page){
 const root=page.locator('#pp-overview'),snapshot=()=>page.evaluate(()=>projectPanoramaAudit()),original=await snapshot(),names=['全部','产品中心','品质中心','研发中心','采购部'];
 const counts=Object.fromEntries(names.map(name=>[name,original.scope.reduce((sum,p)=>sum+p.ledger.filter(r=>r.status!=='已闭环'&&['红灯','黄灯'].includes(r.light)&&(Array.isArray(r.department)?r.department:[r.department]).some(dept=>names.slice(1).includes(dept)&&(name==='全部'||dept===name))).length,0)]));
 assert.deepEqual(await root.locator('[data-pp-risk-department]').evaluateAll(nodes=>nodes.map(n=>n.dataset.ppRiskDepartment)),names);
 await page.locator('.pp-distribution,#pp-filters,#pp-table-scroll').evaluateAll(nodes=>nodes.forEach(node=>node.departmentControlProbe=true));
 for(const name of names){
  await root.locator('[data-pp-risk-department="'+name+'"]').click();
  assert.equal(await root.locator('[data-pp-department-title]').innerText(),name==='全部'?'责任部门风险数':name+'风险数');
  assert.equal(await root.locator('[data-pp-risk-department="'+name+'"]').getAttribute('aria-pressed'),'true');
  const shown=await root.locator('[data-pp-dept-count]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.ppDeptCount)));
  assert.deepEqual(shown,names.map(n=>counts[n]),'切换部门不改写其他按钮计数');
  const bars=await root.locator('.pp-departments .pp-risk-counts button').allTextContents();assert.equal(bars.reduce((n,value)=>n+Number(value),0),counts[name],'按钮风险条数等于右图红黄灯合计');
  assert(await page.locator('.pp-distribution,#pp-filters,#pp-table-scroll').evaluateAll(nodes=>nodes.every(node=>node.departmentControlProbe)),'只重绘右图');
  const current=await snapshot();assert.equal(current.state.page,original.state.page);assert.deepEqual(current.filtered.map(p=>p.id),original.filtered.map(p=>p.id));
  await page.mouse.move(0,0);await page.waitForTimeout(180);
  const appearance=await root.locator('[data-pp-risk-department="'+name+'"]').evaluate(node=>{const s=getComputedStyle(node);return{height:node.getBoundingClientRect().height,color:s.color,background:s.backgroundColor,padding:parseFloat(s.paddingLeft),badge:getComputedStyle(node.querySelector('.pp-dept-count')).backgroundColor,gap:parseFloat(getComputedStyle(node.parentElement).gap)}});
  assert(appearance.height>=36);assert.equal(appearance.color,'rgb(23, 101, 209)');assert.equal(appearance.background,'rgb(237, 244, 255)');assert(appearance.padding>=14&&appearance.gap>=10);assert.equal(appearance.badge,'rgba(0, 0, 0, 0)');
 }
 if(original.state.riskDepartment!=='全部')await root.locator('[data-pp-risk-department="'+original.state.riskDepartment+'"]').click();
 console.log('通过：部门计数与柱图同源、动态标题、浅蓝选中态、标签留白及右图独立更新');
}
