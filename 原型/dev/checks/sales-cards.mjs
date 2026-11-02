import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const fixedBrands=['苏泊尔','美的','创维','海尔','康佳'];
const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
const scope=(page,index)=>page.locator('[data-ms-section="'+index+'"]');
const money=text=>parseFloat(text.replaceAll(',',''))*(text.includes('w')?1:1/10000);
export async function salesCards(page){
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#sales"]').click();
 const snapshot=()=>page.evaluate(()=>dashboardSalesReviewSnapshot());
 assert.equal(await page.locator('.ms-scope-section').count(),5);
 assert.equal(await page.locator('#sales [data-ms-scope],#sales [data-si-toggle],#sales [role="tabpanel"],#sales .ms-pane-note,#sales .ms-table-note').count(),0,'不再选择链群或切换品牌平台，也不保留三处说明');
 async function verifySections(){
  const data=await snapshot();assert.deepEqual(await page.locator('.ms-scope-heading h3').allTextContents(),['公司整体',...data.chains.map(row=>row.name)]);
  for(const section of data.sections){
   const host=scope(page,section.index),summary=section.summary;
   assert.equal(await host.locator('.ms-scope-icon[aria-hidden="true"]').count(),1,'公司与链群使用统一装饰图标');
   assert.equal(await host.locator('.ms-platform-label>img').count(),6,'六个平台复用现有图标');
   assert.equal(await host.locator('.ms-brand-label>img').count(),5,'五品牌均展示独立Logo');
   await host.locator('.ms-brand-label>img,.ms-platform-label>img').evaluateAll(nodes=>Promise.all(nodes.map(img=>img.decode())));
   assert(await host.locator('.ms-brand-label>img').evaluateAll(nodes=>nodes.length===5&&nodes.every(img=>img.naturalWidth>=128&&img.naturalWidth===img.naturalHeight&&img.getBoundingClientRect().width===32&&getComputedStyle(img).objectFit==='contain')),'五品牌使用原生方形素材，统一32px宽且保持原比例');
   assert(await host.locator('.ms-brand-label>img,.ms-platform-label>img').evaluateAll(nodes=>nodes.every(img=>img.naturalWidth>0&&img.getBoundingClientRect().height===32)),'两侧图标加载成功且放大至32px高');
   assert(await host.locator('.ms-brand-label,.ms-platform-label').evaluateAll(nodes=>nodes.every(node=>{const img=node.querySelector('img').getBoundingClientRect(),text=node.querySelector('span').getBoundingClientRect();return text.left>=img.right+7&&Math.abs(text.top+text.height/2-img.top-img.height/2)<1&&node.scrollWidth<=node.clientWidth+1})),'图标名称垂直居中且不重叠');
   const level=await host.evaluate(node=>{const style=s=>getComputedStyle(node.querySelector(s));const actual=style('.ms-gsv-actual'),target=style('.ms-gsv-target');return {actualWeight:+actual.fontWeight,targetWeight:+target.fontWeight,actualColor:actual.color,targetColor:target.color,targetCard:parseFloat(style('[data-ms-metric="target"] strong').fontSize),actualCard:parseFloat(style('[data-ms-metric="sale"] strong').fontSize),scale:parseFloat(style('[data-ms-metric="scaleRate"] strong').fontSize)}});
   assert(level.actualWeight>level.targetWeight&&level.actualColor!==level.targetColor,'表格实际和目标层级区分');assert(level.actualCard>level.targetCard&&level.scale>level.actualCard,'卡片实际值与规模达成率层级');
   assert.deepEqual([...new Set(await host.locator('.ms-gsv-cell .ms-delta-label').allTextContents())],['差额'],'保留差额表达');
   assert.deepEqual(await host.locator('.ms-scope-label').allTextContents(),['GSV','目标GSV','利润率','目标利润率','规模达成率','SKU总数']);
   assert.deepEqual(await host.locator('.ms-summary-card').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('[data-ms-metric]')].map(metric=>metric.dataset.msMetric))),[['sale','target'],['actualMargin','targetMargin'],['scaleRate'],['sku']],'同组指标归入同一卡片');
   for(const key of ['sale','target','actualMargin','targetMargin','scaleRate','sku'])assert.equal(Number(await host.locator('[data-ms-metric="'+key+'"]').getAttribute('data-value')),summary[key],'指标卡与原汇总同源 '+summary.name+'/'+key);
   const progress=host.locator('.ms-summary-scale [role="progressbar"]');
   assert.equal(Number(await progress.getAttribute('aria-valuenow')),summary.scaleRate,'卡片保留规模达成进度');
   assert.match(await progress.getAttribute('aria-valuetext'),/时间进度.*规模达成.*偏差/);
   assert(Math.abs(await progress.locator('.ms-time-marker').evaluate(node=>parseFloat(node.style.left))-summary.progress)<.0001,'时间进度标记与当前期间一致');
   assert(await progress.evaluate(node=>node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>=5),'规模进度条实际可见');
   for(const view of ['brand','platform']){
    const table=host.locator('[data-ms-breakdown-view="'+view+'"]'),names=view==='brand'?fixedBrands:platforms;
    const p=data.period,prefix=p.mode==='year'?String(p.year).slice(-2)+'年':p.mode==='quarter'?'Q'+p.value:p.value+'月';
    assert.deepEqual(await table.locator('thead th').allTextContents(),[view==='brand'?'品牌':'平台',prefix+'实际 / 目标GSV',prefix+'实际 / 目标利润率','规模达成'],'三组指标表头跟随期间');
    assert.deepEqual(await table.locator('tbody th').allTextContents(),names,'固定品牌及六平台同时展示');
    const shown=await table.locator('tbody tr').evaluateAll(nodes=>nodes.map(node=>({name:node.querySelector('th').textContent,sale:node.querySelector('.ms-gsv-actual').textContent,target:node.querySelector('.ms-gsv-target').textContent,gap:node.querySelector('.ms-gsv-cell>small span:last-child').textContent,margin:node.querySelector('.ms-margin-actual').textContent,targetMargin:node.querySelector('.ms-margin-target').textContent,marginGap:node.querySelector('td:nth-child(3)>small span:last-child').textContent,scale:node.querySelector('.ms-scale-main>strong').textContent,deviation:node.querySelector('.ms-scale-cell>small span:last-child').textContent,progress:Number(node.querySelector('.ms-scale-main [role="progressbar"]').getAttribute('aria-valuenow')),marker:parseFloat(node.querySelector('.ms-scale-main .ms-time-marker').style.left)})));
    for(const item of shown){
     const row=section[view].find(row=>row.name===item.name);
     for(const key of ['sale','target','gap'])assert(Math.abs(money(item[key])-row[key])<.051,'实际/目标及差额沿用对应链群 '+key);
     assert.equal(item.margin,row.actualMargin.toFixed(1)+'%');assert.equal(item.targetMargin,row.targetMargin.toFixed(1)+'%','目标利润率读取同范围目标');assert.equal(item.scale,row.scaleRate.toFixed(1)+'%');
     assert.equal(parseFloat(item.marginGap),Number(row.marginGap.toFixed(1)));assert.equal(parseFloat(item.deviation),Number(row.scaleDeviation.toFixed(1)));
     assert.equal(item.progress,row.scaleRate);assert(Math.abs(item.marker-row.progress)<.0001,'同行进度条保留时间进度');
    }
    for(const key of ['sale','target','gross','targetGross','sku'])assert(Math.abs(section[view].reduce((sum,row)=>sum+row[key],0)-summary[key])<.001,'分组汇总守恒 '+summary.name+'/'+view+'/'+key);
   }
  }
 }
 for(const [mode,value] of [['month','10'],['month','9'],['quarter','3'],['year',null]]){
  await page.locator('#time-sales [data-time-mode="'+mode+'"]').click();if(value)await page.locator('#time-sales [data-time-value]').selectOption(value);
  const facts=await page.evaluate(()=>({snapshot:dashboardSalesReviewSnapshot(),series:dashboardSalesTrendSnapshot(-1)}));
  const days=await page.evaluate(()=>window.dashboardSalesTrendSnapshot(-1,true));
  const firstMonth=mode==='year'?1:mode==='quarter'?(Number(value)-1)*3+1:Number(value);
  const start=facts.snapshot.period.year+'-'+String(firstMonth).padStart(2,'0')+'-01';
  assert(Math.abs(days.filter(r=>r.date>=start).reduce((n,r)=>n+r.value,0)-facts.snapshot.company.sale)<.001);
  assert(facts.series.every(r=>r.date<='2026-10-10'));
  if(mode==='quarter'){assert.equal(facts.series.length,24);assert.equal(facts.series[0].date,'2026-04-20')}
  if(mode==='year'){assert.equal(facts.series.length,24);assert.equal(facts.series[0].date,'2024-11-01')}
  for(const index of [-1,0,1,2,3]){
   const data=await page.evaluate(i=>({buckets:window.dashboardSalesTrendSnapshot(i),days:window.dashboardSalesTrendSnapshot(i,true)}),index);
   assert.equal(data.buckets.reduce((n,b)=>n+(Date.parse(b.end)-Date.parse(b.date))/86400000+1,0),data.days.length);
   for(const bucket of data.buckets){
    const days=data.days.filter(r=>r.date>=bucket.date&&r.date<=bucket.end),sale=days.reduce((n,r)=>n+r.value,0),gross=days.reduce((n,r)=>n+r.gross,0);
    assert(Math.abs(bucket.value-sale)<1e-8);assert(Math.abs(bucket.gross-gross)<1e-8);assert(Math.abs(bucket.margin-gross/sale*100)<1e-8);
   }
  }
  const {company:total,chains,brands,channels}=facts.snapshot;
  assert.deepEqual(channels.map(r=>r.name),platforms);
  for(const group of [chains,brands,channels])for(const key of ['sale','target','gross','targetGross','expense','netSales','salesUnits','sku'])assert(Math.abs(group.reduce((n,r)=>n+r[key],0)-total[key])<.001,'同范围合计守恒 '+key);
  for(const row of [total,...chains,...brands,...channels]){
   for(const key of ['sale','target','actualMargin','targetMargin','gap','marginGap','scaleRate','scaleDeviation','feeRate','expense','netSales','salesUnits','sku'])assert(Number.isFinite(row[key]),row.name+' '+key);
   assert(Number.isInteger(row.salesUnits)&&row.salesUnits>=row.netSales);
   assert(row.gsvRate<=100&&row.scaleRate<=100);
   assert(Math.abs(row.gsvDeviation-(row.gsvRate-facts.snapshot.progress))<1e-9);
   assert(Math.abs(row.scaleDeviation-(row.scaleRate-facts.snapshot.progress))<1e-9);
  }

  await verifySections();
 }
 const scroll=page.locator('.ms-sections-host');
 await page.locator('#time-sales [data-time-mode="quarter"]').click();
 assert.equal(await scroll.evaluate(node=>node.scrollTop),0,'不生成区域纵向滚动');
 await page.locator('#time-sales [data-time-value]').selectOption('3');
 assert.equal((await snapshot()).company.gap,1346);
 assert.match(await scope(page,-1).locator('[data-ms-metric="sale"] small').innerText(),/1346/);
 for(const width of [1920,1440,1280,1024,800,600,390,320]){
  await page.setViewportSize({width,height:1080});await scroll.evaluate(node=>node.scrollTop=0);
  const layout=await scroll.evaluate(node=>({overflow:node.scrollWidth-node.clientWidth,scrollable:node.scrollHeight>node.clientHeight,groups:[...node.querySelectorAll('.ms-scope-section')].map(section=>({top:section.offsetTop,bottom:section.offsetTop+section.offsetHeight,panels:[...section.querySelectorAll('.ms-scope-breakdown')].map(panel=>{const rect=panel.getBoundingClientRect();return{top:rect.top,left:rect.left,right:rect.right,bottom:rect.bottom}})}))}));
  assert(layout.overflow<=2&&!layout.scrollable,'内容自然展开，不产生区域滚动 '+width);
  assert(layout.groups.every((group,index)=>!index||group.top>=layout.groups[index-1].bottom),'公司及链群依次排列');
  for(const group of layout.groups){if(width>1100)assert(Math.abs(group.panels[0].top-group.panels[1].top)<1&&group.panels[1].left>group.panels[0].right,'桌面双表并排');else assert(group.panels[1].top>=group.panels[0].bottom,'窄屏双表上下排列')}
  for(const section of await page.locator('.ms-scope-section').all()){
   const brand=section.locator('[data-ms-breakdown-view="brand"] .ms-table-scroll'),platform=section.locator('[data-ms-breakdown-view="platform"] .ms-table-scroll');
   const bounds=await Promise.all([brand.boundingBox(),platform.boundingBox()]);
   if(width>1100){
    assert(Math.abs(bounds[0].height-bounds[1].height)<1&&Math.abs(bounds[0].y-bounds[1].y)<1,'平台表与品牌表等高对齐');
    await platform.evaluate(node=>node.scrollTop=node.scrollHeight);
    assert(await platform.evaluate(node=>node.scrollTop>0),'六平台支持表内滚动');
    const visible=await platform.evaluate(node=>{const box=node.getBoundingClientRect(),head=node.querySelector('thead th').getBoundingClientRect(),last=node.querySelector('tbody tr:last-child').getBoundingClientRect();return{head:head.top-box.top,last:last.bottom-box.top,client:node.clientHeight}});
    assert(Math.abs(visible.head-1)<1,'滚动时平台表头固定');
    assert(visible.last<=visible.client+2,'滚动可完整查看第六个平台');
    await platform.evaluate(node=>node.scrollTop=0);
   }else assert(await platform.evaluate(node=>node.scrollHeight<=node.clientHeight+1),'窄屏上下布局自然显示六平台');
  }
  assert(await page.locator('.ms-scope-metric,.ms-summary-card').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+2)),'卡片内容不溢出 '+width);
  assert(await page.locator('#sales .ms-gsv-pair,#sales .ms-margin-pair,#sales .ms-scale-main').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+2)),'合并数值与同行进度条不挤压 '+width);
  await scope(page,3).locator('h3').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  assert(await page.evaluate(()=>window.scrollY>0),'由页面滚动到最后一条链群');assert.equal(await scroll.evaluate(node=>node.scrollTop),0);
  assert(await scroll.evaluate(node=>getComputedStyle(node).overflowY==='visible'),'区域不截断内容');
 }
 await page.setViewportSize({width:1920,height:1080});await scroll.evaluate(node=>node.scrollTop=0);
 await scope(page,-1).locator('.ms-scope-tables').screenshot({path:fileURLToPath(new URL('../../outputs/sales-aligned-tables-1920.png',import.meta.url))});
 await scope(page,-1).locator('.ms-scope-metrics').screenshot({path:fileURLToPath(new URL('../../outputs/sales-grouped-cards-1920.png',import.meta.url))});
 await page.locator('#sales').screenshot({path:fileURLToPath(new URL('../../outputs/sales-scroll-1920.png',import.meta.url))});
 await page.setViewportSize({width:390,height:1080});await scroll.evaluate(node=>node.scrollTop=0);
 await scope(page,-1).locator('.ms-scope-metrics').screenshot({path:fileURLToPath(new URL('../../outputs/sales-grouped-cards-390.png',import.meta.url))});
 await page.locator('#sales').screenshot({path:fileURLToPath(new URL('../../outputs/sales-scroll-390.png',import.meta.url))});
 await page.setViewportSize({width:1920,height:1080});assert(await page.locator('#overlay').isHidden());
 console.log('通过：五组指标卡与双表、期间与原台账守恒、页面滚动且无区域滚动、宽窄屏布局');
}
