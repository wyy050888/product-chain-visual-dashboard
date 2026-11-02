import {modelClock} from './model-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectRiskEvents(page){
 // 日期边界样例固定在10月10日。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const ctx=vm.createContext({...modelClock(),window:{}});
 for(const file of ['01-model','10-risk-events-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const rows=[{id:1,ledger:[{id:'a',light:'红灯',recordedAt:'2026-10-01',closedAt:'2026-10-10'},{id:'a',light:'红灯',recordedAt:'2026-10-01'},{id:'b',light:'黄灯',recordedAt:'2026-09-30',closedAt:'2026-10-01'},{id:'c',light:'红灯',deadline:'2026-10-05'},{id:'d',light:'绿灯',recordedAt:'2026-10-01'}]}];
 const facts=ctx.ppRiskEvents(rows,{start:'2026-10-01',end:'2026-10-10'});
 assert.equal(facts.filter(e=>e.kind==='new').length,1);assert.equal(facts.filter(e=>e.kind==='closed').length,2);
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
 assert.equal(await page.locator('#pp-overview .pp-events,[data-pp-event-dimension],[data-pp-event-period]').count(),0,'移除风险新增与闭环图及其控件');
 assert.deepEqual(await page.locator('#pp-overview>.pp-card h3').allTextContents(),['进行中项目分布','责任部门风险数']);
 for(const width of [1920,1440,390]){
  await page.setViewportSize({width,height:1080});
  const cards=await page.locator('#pp-overview>.pp-card').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,overflow:el.scrollWidth-el.clientWidth}}));
  assert.equal(cards.length,2);assert(cards.every(card=>card.overflow<=1&&card.right<=width+1),'两图不溢出 '+width);
  if(width>1200){assert(Math.abs(cards[0].width-cards[1].width)<1,'两图五五分');assert(Math.abs(cards[0].top-cards[1].top)<1&&Math.abs(cards[0].bottom-cards[1].bottom)<1,'两图等高对齐')}
 }
 await page.setViewportSize({width:1920,height:1080});
}
