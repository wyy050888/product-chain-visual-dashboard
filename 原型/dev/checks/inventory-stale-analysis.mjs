import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function verifyStaleModels(){
 const storage=new Map(),ctx=vm.createContext({window:{},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},filterCatalog:{seasons:['夏季品','冬季品','四季品']},targetSum:values=>values.reduce((sum,value)=>sum+value,0),pfIncludes:(selection,value)=>selection==='all'||selection.includes(value),aiFlowDayDiff:(start,end)=>(Date.parse(end)-Date.parse(start))/86400000,iso:date=>date.toISOString().slice(0,10),DATA_CUTOFF:'2026-10-27'});
 for(const file of ['02-stale-snapshots','02-stale-analysis-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/inventory-period/'+file+'.js',import.meta.url),'utf8'),ctx);
 const allocation=fs.readFileSync(new URL('../../src/modules/sales-target/01.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('function splitTarget('));vm.runInContext(allocation,ctx);
 ctx.shiftDate=(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/inventory-period/02-stale-samples.js',import.meta.url),'utf8'),ctx);
 const received=days=>new Date(Date.parse('2026-10-27')-days*86400000).toISOString().slice(0,10);
 const batch=days=>({receivedDate:received(days),units:10,valueCents:100});
 const row={spuId:'a',season:'夏季品',totalUnits:100,totalValueCents:1000,staleUnits:90,staleValueCents:900,batches:[59,60,89,90,119,120,149,150].map(batch)};
 const snapshot=ctx.ipNormalizeSnapshot({date:'2026-10-27',rows:[row]});assert(snapshot);
 const batches=ctx.ipStaleSampleBatches(row,snapshot.date),sample=ctx.ipNormalizeSnapshot({...snapshot,source:'local-sample',rows:[{...row,batches}]});assert(sample);
 assert.equal(batches.reduce((n,batch)=>n+batch.units,0),row.staleUnits);assert.equal(batches.reduce((n,batch)=>n+batch.valueCents,0),row.staleValueCents);assert.equal(JSON.stringify(batches),JSON.stringify(ctx.ipStaleSampleBatches(row,snapshot.date)),'刷新不使用随机值');
 assert.equal(ctx.ipStaleDistribution(sample,'all').unknown.units,0);assert.equal(ctx.ipStaleDistribution(sample,'all').unknown.valueCents,0);
 const generated=ctx.ipStaleSampleHistory(sample,[{...sample,date:'2025-06-18',source:'snapshot'}]);assert.equal(generated.length,20);assert(generated.every(item=>item.source==='local-sample'&&item.date<'2026-10-01'&&!item.date.startsWith('2025-06')),'真实和已存月份不覆盖');
 const data=ctx.ipStaleDistribution(snapshot,'all');assert.deepEqual(Array.from(data.bands,band=>band.units),[20,20,20,10]);assert.deepEqual(Array.from(data.bands,band=>band.valueCents),[200,200,200,100]);assert.equal(data.other.units,10);assert.equal(data.unknown.units,10);assert.equal(data.unknown.valueCents,100);
 assert.equal(data.units,data.bands.reduce((n,band)=>n+band.units,0)+data.other.units+data.unknown.units);
 assert.equal(data.totalUnits,100);assert.equal(data.totalValueCents,1000);
 const empty=ctx.ipStaleDistribution(snapshot,['冬季品']);assert.equal(empty.totalUnits,0);assert.equal(empty.totalValueCents,0);
 assert.equal(ctx.ipNormalizeSnapshot({date:'2026-02-30',rows:[]}),null);
 assert.equal(ctx.ipNormalizeSnapshot({date:'2026-10-27',rows:[row,row]}),null);
 assert.equal(ctx.ipNormalizeSnapshot({date:'2026-10-27',rows:[{...row,staleUnits:101}]}),null);
 const partial=ctx.ipStaleDistribution(ctx.ipNormalizeSnapshot({date:'2026-10-27',rows:[{...row,batches:[{...batch(150),valueCents:null}]}]}),'all');assert.equal(partial.knownUnits,10);assert.equal(partial.knownValueCents,0,'未知批次货值不能按均价分摊');
 const second={...row,spuId:'b',season:'冬季品',totalValueCents:9000,staleValueCents:90,batches:[]};
 const history=[snapshot,ctx.ipNormalizeSnapshot({date:'2026-09-30',rows:[{...row,batches:[]},second]})];
 const trend=ctx.ipStaleTrend(history,'month','2026-10-27','all'),september=trend.find(item=>item.date==='2026-09-30');assert.equal(september.ratio,990/10000*100,'按分子分母汇总，不平均单品占比');assert.equal(trend.filter(item=>item.date).length,2);assert.equal(trend[0].ratio,null,'缺失历史不是0');
 assert.equal(ctx.ipStaleTrend(history,'quarter','2026-10-27','all').filter(item=>item.date).length,2);
 assert.equal(ctx.ipStaleTrend(history,'year','2026-10-27',['冬季品']).at(-1).totalValueCents,0,'当期最新快照无该季品时保留零，不回填旧快照');
 assert.equal(ctx.ipStaleTrend(history,'month','2026-09-29','all').some(item=>item.date==='2026-09-30'),false,'不读取截止日之后的快照');
}
export async function inventoryStaleAnalysis(page){
 verifyStaleModels();
 await page.locator('a[href="#inventory"]').click();
 const host=page.locator('#inventory-stale-analysis'),audit=()=>page.evaluate(()=>inventoryStaleAnalysisAudit()),original=await audit(),overview=await page.evaluate(()=>inventoryControlAudit().overview);
 assert.equal(original.distribution.units,overview.staleUnits);assert.equal(original.distribution.valueCents,overview.staleValueCents);assert(original.snapshots.length>=12,'补齐月度样例快照');assert(original.snapshots.every(snapshot=>snapshot.source==='local-sample'),'样例保留来源标记');
 assert.equal(original.distribution.unknown.units,0);assert.equal(original.distribution.unknown.valueCents,0);
 for(const band of original.distribution.bands){assert(band.units>0&&band.valueCents>0);assert(band.seasons.every(season=>season.units>0&&season.valueCents>0),'四区间各季品都有可对比样例');}
 assert.equal(original.distribution.bands.reduce((n,band)=>n+band.units,0)+original.distribution.other.units,overview.staleUnits);assert.equal(original.distribution.bands.reduce((n,band)=>n+band.valueCents,0)+original.distribution.other.valueCents,overview.staleValueCents);
 assert.deepEqual(await host.locator('h3').allTextContents(),['呆滞库存分布','呆滞货值占比趋势']);assert.equal(await host.locator('.ip-stale-footnote,.ip-stale-source').count(),0,'不展示冗余实现说明');
 assert.equal(await host.locator('.ip-stale-insight').count(),0,'删除150天以上提示条');
 assert.deepEqual(await host.locator('.ip-stale-age-columns>span').allTextContents(),['库龄','夏季品','冬季品','四季品','合计占比']);
 for(const row of await host.locator('[data-ip-stale-band]').all())assert.equal(await row.locator('.ip-stale-age-cell').count(),3,'每个库龄区间直接列三类季品数据');
 assert((await host.locator('.ip-stale-trend-stats>div+div').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).borderLeftWidth))).every(value=>value==='1px'),'右侧指标用竖线分隔');
 assert.equal(await page.locator('[data-stock-card="staleDistribution"]').count(),0);
 assert.equal(await host.locator('[data-ip-stale-mode]').count(),0,'趋势图不再保留独立时间控件');
 assert.equal(await page.locator('#inventory .ip-metric-period').count(),1,'只保留模块右上角统一控件');
 assert.equal(await host.locator('[data-ip-stale-metric]').count(),2);
 assert.equal(await host.locator('[data-ip-stale-metric="valueCents"]').getAttribute('aria-pressed'),'true','默认货值');
 assert.deepEqual(original.metrics,['units','valueCents']);
 assert.equal(await host.locator('.ip-stale-age-heading h4').innerText(),'库龄分布');assert.equal(await host.locator('.ip-stale-age-heading>span').count(),0,'移除标题右侧重复单位');
 assert.equal(await host.locator('.ip-stale-cell-track').count(),0,'库龄格内不再重复进度条');
 const format=(value,metric)=>metric==='units'?value.toLocaleString('en-US')+'件':(value/1000000).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'万元';
 for(const metric of ['valueCents','units','valueCents']){
  await host.locator('[data-ip-stale-metric="'+metric+'"]').click();
  assert.equal(await host.locator('[data-ip-stale-metric="'+metric+'"]').getAttribute('aria-pressed'),'true');
  const attribute=metric==='units'?'data-stock-stale-season':'data-stock-stale-season-value';
  for(const season of original.distribution.seasons){
   const value=host.locator('['+attribute+'="'+season.label+'"]');assert.equal(await value.innerText(),format(season[metric],metric));
   assert.equal(await value.locator('..').locator('.ip-stale-share').innerText(),(season[metric]/original.distribution[metric]*100).toFixed(1)+'%');
  }
  assert.equal(await host.locator('.ip-stale-season-summary [data-ip-stale-line]').count(),3,'每个季品只展示当前口径');
  for(const row of await host.locator('[data-ip-stale-band]').all()){
   const key=await row.getAttribute('data-ip-stale-band'),data=/^\d+$/.test(key)?original.distribution.bands[Number(key)]:original.distribution[key];
   assert.equal(await row.locator('[data-ip-age-metric]').count(),3,'每个季品格只有一个数值');
   for(const season of data.seasons){const cell=row.locator('[data-ip-age-season="'+season.label+'"]');assert.equal(await cell.locator('[data-ip-age-metric="'+metric+'"]').innerText(),format(season[metric],metric));assert.equal(await cell.locator('.ip-stale-share').innerText(),(season[metric]/original.distribution[metric]*100).toFixed(1)+'%','各格按当前呆滞总量计算占比');}
   const total=row.locator('.ip-stale-age-total [data-ip-stale-line="'+metric+'"]');
   assert.equal(await total.locator('.ip-stale-amount').innerText(),format(data[metric],metric));
   assert.equal(await total.locator('.ip-stale-share').innerText(),(data[metric]/original.distribution[metric]*100).toFixed(1)+'%','分别使用件数/货值总量计算占比');
   assert.equal(await row.locator('.ip-stale-age-cell .ip-stale-share').count(),3,'各季品格都带占比');
  }
  const segments=await host.locator('.ip-stale-distribution .ip-stale-stack>span').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.width)));
  const shares=original.distribution.seasons.filter(row=>row[metric]>0).map(row=>row[metric]/original.distribution[metric]*100);assert(segments.every((value,index)=>Math.abs(value-shares[index])<.0001),'分布条随口径切换');
  const current=await audit();assert.deepEqual(current.snapshots,original.snapshots);assert.deepEqual(current.trend,original.trend,'不改变右侧货值趋势');
  assert.deepEqual(await host.locator('.ip-stale-distribution-total>div>span').allTextContents(),[metric==='units'?'呆滞库存':'呆滞货值','呆滞占比']);
  assert.equal(await host.locator('[data-ip-stale-total]').innerText(),format(original.distribution[metric],metric));
  const denominator=original.distribution[metric==='units'?'totalUnits':'totalValueCents'];
  assert.equal(await host.locator('[data-ip-stale-total-share]').innerText(),(original.distribution[metric]/denominator*100).toFixed(1)+'%','顶部占比以同一快照的总库存/总货值为分母');
 }
 const bar=host.locator('.ip-stale-distribution .ip-stale-stack');assert.equal(await bar.count(),1);
 assert.equal(await bar.locator('[data-metric-rule],[title],[tabindex],.ip-stale-mark').count(),0,'季品分布条不触发说明提示');
 for(const segment of await bar.locator('span').all()){await segment.hover();await page.waitForTimeout(250);assert(await page.locator('#metric-tooltip').isHidden(),'悬停季品条不弹提示');}
 // 只在隔离测试浏览器内注入历史快照，验证实际双柱与折线；不写入原型样例数据。
 await page.evaluate(()=>{
  const data=inventoryStaleAnalysisAudit(),current=data.snapshots.at(-1),year=Number(current.date.slice(0,4)),month=Number(current.date.slice(5,7));
  const snapshots=Array.from({length:12},(_,index)=>{const date=new Date(Date.UTC(year,month-12+index,0)).toISOString().slice(0,10);return {date,source:'snapshot',rows:current.rows.map(row=>({...row,batches:[],totalValueCents:Math.round(row.totalValueCents*(.75+index*.03)),staleValueCents:Math.round(row.staleValueCents*(.45+index*.06))}))}});
  localStorage.setItem('dashboard.inventory-snapshots.v1',JSON.stringify({version:1,snapshots:[...snapshots,current]}));
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('a[href="#inventory"]').click();
 for(const mode of ['month','quarter','year']){await page.locator('#inventory>.sectionhead [data-ip-time-mode="'+mode+'"]').click();const data=await audit();assert.equal(data.mode,mode);assert.equal(await host.locator('[data-ip-stale-metric="valueCents"]').getAttribute('aria-pressed'),'true','切换期间保留展示口径');assert(data.trend.filter(item=>item.date).length>=2);assert.equal(await host.locator('[data-ip-trend-date]').count(),data.trend.filter(item=>item.date).length);assert.equal(await host.locator('svg circle').count(),data.trend.filter(item=>item.ratio!==null).length);}
 await page.locator('#inventory>.sectionhead [data-ip-time-mode="month"]').click();
 const time=page.locator('#inventory>.sectionhead [data-ip-period-host]'),period=await page.evaluate(()=>inventoryControlAudit().metricPeriod),snapshots=JSON.stringify((await audit()).snapshots);
 await time.locator('[data-ip-time-year]').selectOption('2025');await time.locator('[data-ip-time-value]').selectOption('6');
 const historical=await audit();assert.equal(historical.mode,'month');assert.equal(historical.trend.at(-1).end,'2025-06-30');assert(historical.trend.every(item=>item.date===null||item.date<='2025-06-30'),'选择年月同时限制趋势截止日');assert.equal(historical.distribution.date,original.distribution.date,'左侧分布保留最新库存');assert.equal(historical.distribution.valueCents,original.distribution.valueCents);assert.equal(JSON.stringify(historical.snapshots),snapshots,'回看历史不改写快照');
 await time.locator('[data-ip-time-year]').selectOption(String(period.year));await time.locator('[data-ip-time-value]').selectOption(String(period.value));
 const before=await audit();await page.locator('#ip-season').evaluate(select=>{for(const option of select.options)option.selected=option.value==='夏季品';select.dispatchEvent(new Event('change',{bubbles:true}))});
 const filtered=await audit();assert.deepEqual(filtered.snapshots,before.snapshots,'季品筛选不得覆盖公司快照');assert.equal(filtered.distribution.units,filtered.distribution.seasons.find(row=>row.label==='夏季品').units);
 assert.equal(await host.locator('[data-ip-stale-total-share]').innerText(),(filtered.distribution.valueCents/filtered.distribution.totalValueCents*100).toFixed(1)+'%','筛选时分子分母同时限定季品');
 await page.locator('#ip-season').evaluate(select=>{for(const option of select.options)option.selected=option.value==='all';select.dispatchEvent(new Event('change',{bubbles:true}))});
 for(const width of [1920,1440,1280,1024,390]){
  await page.setViewportSize({width,height:1080});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(await host.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'图表区域不横向溢出 '+width);
  const panels=await host.locator('.ip-stale-panel').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,height:r.height,overflow:element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+1}}));assert(panels.every(panel=>!panel.overflow&&panel.left>=0&&panel.right<=width));if(width>1200){assert(Math.abs(panels[0].top-panels[1].top)<1);assert(Math.abs(panels[0].height-panels[1].height)<1);assert(panels[0].height<800,'桌面模块内可直接看全');}
  assert(await host.locator('.ip-stale-season-value').evaluateAll(elements=>elements.every(element=>{const amount=element.querySelector('.ip-stale-amount'),share=element.querySelector('.ip-stale-share'),a=amount.getBoundingClientRect(),b=share.getBoundingClientRect(),sa=getComputedStyle(amount),sb=getComputedStyle(share);return !!(share.compareDocumentPosition(amount)&Node.DOCUMENT_POSITION_FOLLOWING)&&(a.top>=b.bottom-1||a.left>=b.right-1)&&parseFloat(sb.fontSize)>parseFloat(sa.fontSize)&&Number(sb.fontWeight)>Number(sa.fontWeight)})),'占比在左、数值在右且占比更突出 '+width);
  const track=await host.locator('.ip-stale-stacks').boundingBox(),legend=await host.locator('.ip-stale-season-summary').boundingBox();assert(legend.y>=track.y+track.height+10,'季品说明在条形下方 '+width);assert(Math.abs(track.width-legend.width)<1,'条形占满上方宽度 '+width);
  if(width>600){const groups=await host.locator('.ip-stale-season-summary>div').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));assert(groups.every(top=>Math.abs(top-groups[0])<1),'桌面三组季品并排 '+width);}
 }
 await page.setViewportSize({width:1920,height:1080});await host.screenshot({path:'outputs/inventory-stale-simplified-1920.png'});await page.setViewportSize({width:390,height:1080});await host.screenshot({path:'outputs/inventory-stale-simplified-390.png'});await page.setViewportSize({width:1920,height:1080});const mark=host.locator('.ip-stale-mark[data-ip-trend-date]').last();await mark.focus();await page.keyboard.press('Enter');await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#metric-tooltip').innerText(),/快照日期/);await page.keyboard.press('Escape');
 await page.evaluate(()=>localStorage.removeItem('dashboard.inventory-snapshots.v1'));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 console.log('通过：批次60/90/120/150边界、守恒、缺失与零、月季年期末快照、持久化、季品筛选、悬浮及宽窄屏；无冗余说明。');
}
