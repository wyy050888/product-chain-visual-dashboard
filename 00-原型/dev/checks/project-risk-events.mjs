import {modelClock} from './model-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectRiskEvents(page){
 // 日期边界样例固定在10月10日。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const ctx=vm.createContext({...modelClock(),window:{}});
 vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);
 for(const file of ['01-model','10-risk-events-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const rows=[{id:1,ledger:[{id:'a',light:'红灯',recordedAt:'2026-10-01',closedAt:'2026-10-10'},{id:'a',light:'红灯',recordedAt:'2026-10-01'},{id:'b',light:'黄灯',recordedAt:'2026-09-30',closedAt:'2026-10-01'},{id:'c',light:'红灯',deadline:'2026-10-05'},{id:'d',light:'绿灯',recordedAt:'2026-10-01'}]}];
 const facts=ctx.ppRiskEvents(rows,{start:'2026-10-01',end:'2026-10-10'});
 assert.equal(facts.filter(e=>e.kind==='new').length,1);assert.equal(facts.filter(e=>e.kind==='closed').length,2);
 const day={start:'2026-10-01',end:'2026-10-01'},shared={id:'shared',department:['产品中心','采购部'],light:'红灯',recordedAt:day.start,closedAt:day.end};
 const grouped=[{id:1,type:'自研开发',ledger:[shared,{...shared}]}];
 for(const department of ['全部','产品中心','采购部','研发中心']){
  const result=ctx.ppEventGroups(grouped,day,'type',department)[0],count=department==='研发中心'?0:1;
  assert.equal(result.new.length,count);assert.equal(result.closed.length,count);
 }
 const calendar=vm.createContext({...modelClock(),nspFilters:{}});
 for(const file of ['new-products/02-launch-picker','ui-controls/06-natural-period-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file+'.js',import.meta.url),'utf8'),calendar);
 assert.equal(calendar.uiPeriodValidDate('2024-02-29'),true);assert.equal(calendar.uiPeriodValidDate('2025-02-29'),false);
 assert.equal(calendar.uiNaturalPeriodRange({mode:'month',year:2024,value:2}).end,'2024-02-29');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'quarter',year:2024,value:1}).end,'2024-03-31');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'year',year:2026,value:1},'2026-10-10').end,'2026-10-10');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'year',year:2027,value:1},'2026-10-10'),null);
 assert.equal(calendar.uiNaturalPeriodRange({mode:'day',start:'2026-10-10',end:'2026-10-01'}),null);
 assert.match(calendar.uiPeriodMonthMarkup(2024,2,{start:null,end:null},null),/data-natural-day="2024-02-29"/);
 assert.doesNotMatch(calendar.uiPeriodMonthMarkup(2025,2,{start:null,end:null},null),/data-natural-day="2025-02-29"/);
 await page.locator('a[href="#projects"]').click();
 const eventChart=page.locator('#pp-overview .pp-events'),dateButton=eventChart.locator('[data-pp-event-period]'),picker=page.locator('#pp-event-date-popover');
 const snap=()=>page.evaluate(()=>projectRiskEventsAudit());
 assert.deepEqual(await page.locator('#pp-overview>.pp-card h3').allTextContents(),['进行中项目分布','未关闭风险数','新增与闭环风险']);
 assert.deepEqual(await eventChart.locator('thead th').allTextContents(),['项目类型','新增','闭环']);
 assert.equal(await eventChart.locator('.pp-track').count(),0);
 const verifyCounts=async(start,end,department,dimension)=>{
  const result=await snap();assert.deepEqual(result.range,{start,end});assert.equal(result.state.department,department);
  const items=await eventChart.locator('[data-pp-event-group]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.ppEventGroup,new:n.querySelector('[data-pp-event-count=new]').textContent,closed:n.querySelector('[data-pp-event-count=closed]').textContent})));
  const byLight=events=>['红灯','黄灯'].map(light=>events.filter(({risk})=>risk.light===light).length).join(' / ');
  assert.deepEqual(items,result.groups.map(group=>({key:group.key,new:byLight(group.new),closed:byLight(group.closed)})));
  for(const group of result.groups)for(const [kind,field] of [['new','recordedAt'],['closed','closedAt']])for(const {project,risk} of group[kind]){
   assert.equal(project[dimension],group.key);
   const date=risk[field].slice(0,10);assert(date>=start&&date<=end);
   assert(department==='全部'||[risk.department].flat().includes(department));
  }
  return result.groups.reduce((sum,group)=>sum+group.new.length+group.closed.length,0);
 };
 assert.equal(await dateButton.innerText(),'10/10');
 await verifyCounts('2026-10-10','2026-10-10','全部','type');
 const usesRiskColors=await eventChart.locator('[data-pp-event-count]').evaluateAll(cells=>{
  const expected=['red','orange'].map(tone=>getComputedStyle(document.querySelector('#pp-overview .pp-departments .pp-risk-counts button.'+tone)).color);
  const separatorColor=getComputedStyle(document.querySelector('#pp-overview .pp-departments .pp-risk-counts>span')).color;
  return cells.every(cell=>{
   const [red,separator,yellow]=cell.children;
   return getComputedStyle(red).color===expected[0]&&getComputedStyle(yellow).color===expected[1]&&getComputedStyle(separator).color===separatorColor;
  });
 });
 assert(usesRiskColors,'新增和闭环的红黄灯数字沿用未关闭风险数的颜色');
 const otherNodes=page.locator('.pp-distribution,.pp-departments,#pp-table-scroll');
 await otherNodes.evaluateAll(nodes=>nodes.forEach(node=>node.eventProbe=true));
 await dateButton.click();assert.equal(await picker.locator('.risk-calendar-month').count(),2);
 assert(await picker.locator('[data-range-date="2026-10-11"]').first().isDisabled());
 await picker.locator('[data-range-date="2026-10-01"]:not(:disabled)').click();
 await verifyCounts('2026-10-10','2026-10-10','全部','type');
 await picker.locator('[data-range-date="2026-10-05"]:not(:disabled)').click();
 assert.match(await dateButton.getAttribute('title'),/^(2026-10-01|26\/10\/01) 至 (2026-10-05|26\/10\/05)$/);
 assert(await verifyCounts('2026-10-01','2026-10-05','全部','type')>0);
 await eventChart.locator('[data-pp-event-department]').selectOption('品质中心');
 await verifyCounts('2026-10-01','2026-10-05','品质中心','type');
 assert(await otherNodes.evaluateAll(nodes=>nodes.every(node=>node.eventProbe)),'日期和责任部门只更新风险事件表');
 await eventChart.locator('[data-pp-event-dimension=category]').click();
 assert.equal(await page.locator('#pp-overview .pp-tabs [aria-pressed="true"]').count(),3);
 for(const attribute of ['data-pp-distribution','data-pp-dept-dimension','data-pp-event-dimension'])assert.equal(await page.locator('['+attribute+'=category]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await eventChart.locator('thead th').allTextContents(),['链群','新增','闭环']);
 await verifyCounts('2026-10-01','2026-10-05','品质中心','category');
 await page.locator('[data-pp-category-tab="清洁"]').click();
 assert((await snap()).rows.every(project=>project.category==='清洁'));
 await page.locator('[data-pp-category-tab="all"]').click();
 await dateButton.click();await picker.locator('[data-range-preset="7"]').click();
 await verifyCounts('2026-10-04','2026-10-10','品质中心','category');
 for(const width of [1920,1440,1280,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  const cards=await page.locator('#pp-overview>.pp-card').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,overflow:el.scrollWidth-el.clientWidth}}));
  assert.equal(cards.length,3);assert(cards.every(card=>card.overflow<=1&&card.right<=width+1),'概览不溢出 '+width);
  const [first,second,events]=cards;
  if(width>1200)assert(['width','top','bottom'].every(key=>Math.abs(first[key]-second[key])<1),'两张条形图等宽等高');
  if(width>1360)assert(first.width>events.width*1.5&&Math.abs(first.top-events.top)<1,'窄表与两张宽图并排');
  else assert(events.top>=second.bottom,'较窄屏幕的表格放在两图下方');
  assert(await eventChart.locator('.pp-event-table-wrap').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'表格列完整显示 '+width);
  assert(await dateButton.locator(':scope>span').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'所选范围完整显示 '+width);
  const charts=await page.locator('#pp-overview .pp-chart-body').evaluateAll(nodes=>nodes.map(body=>{
   const label=[...body.querySelectorAll('.pp-bar-label')].find(el=>el.textContent==='个护&健康');
   const text=document.createRange();text.selectNodeContents(label);
   return {height:body.getBoundingClientRect().height,lines:text.getClientRects().length,fits:text.getBoundingClientRect().right<=label.nextElementSibling.getBoundingClientRect().left};
  }));
  assert(charts.every(chart=>chart.height===192&&chart.lines===1&&chart.fits),'链群标签单行展示，图表按四行收口 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 const gap=await page.locator('#pp-layout').evaluate(layout=>layout.querySelector('.pp-main-table').getBoundingClientRect().top-layout.querySelector('.pp-chart-body').getBoundingClientRect().bottom);
 assert(gap>=0&&gap<=28,'概览和项目明细之间留白紧凑');
 await dateButton.click();await picker.locator('[data-range-preset=today]').click();
 await verifyCounts('2026-10-10','2026-10-10','品质中心','category');
 console.log('通过：风险新增与闭环日期、部门归属与去重、图表分组联动、日期独立和六档宽度。');
}
