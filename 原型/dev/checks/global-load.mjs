import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyKeyProductDetail} from './key-products-detail.mjs';
import {verifyKeyProductChart} from './key-products-chart.mjs';
import {verifyKeyProductZoom} from './key-products-zoom.mjs';
import {verifyCompanyStockBatch} from './company-stock-batch.mjs';

function verifyLayoutBatch(){
 const frames=[],events=[];
 const context=vm.createContext({requestAnimationFrame:fn=>(frames.push(fn),frames.length)});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/performance/02-layout.js',import.meta.url),'utf8'),context);
 const a={isConnected:true,id:'a'},b={isConnected:true,id:'b'},removed={isConnected:false,id:'removed'};
 const measure=host=>{events.push('read '+host.id);return ()=>events.push('write '+host.id)};
 for(const host of [a,a,b,removed])context.dashboardQueueLayout(host,measure);
 assert.equal(frames.length,1,'同帧的多个模块只排一次批处理');frames.shift()();
 assert.deepEqual(events,['read a','read b','write a','write b'],'全部测量必须在写入之前，去重并跳过已移除节点');
 context.dashboardQueueLayout(a,()=>()=>context.dashboardQueueLayout(b,measure));
 frames.shift()();assert.equal(frames.length,1,'写入引发的新测量放下一帧');frames.shift()();
 assert.deepEqual(events.slice(-2),['read b','write b']);
}
export async function globalLoad(page){
 verifyLayoutBatch();
 verifyCompanyStockBatch();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 for(const width of [1920,1280,390,1920]){
  await page.setViewportSize({width,height:1080});await settle();
  const layout=await page.evaluate(()=>{
   const tables=[['#newtable','--nsp-table-max-height'],['#matrixtable','--kpm-table-max-height'],['#pp-table-scroll','--pp-table-max-height']].map(([selector,property])=>{
    const host=document.querySelector(selector),table=host.querySelector('table'),row=table?.tBodies[0]?.rows[6];
    const expected=row?Math.ceil(row.getBoundingClientRect().top-table.getBoundingClientRect().top+row.getBoundingClientRect().height/2+host.offsetHeight-host.clientHeight):null;
    return {selector,height:parseFloat(host.style.getPropertyValue(property)),expected};
   });
   const host=document.querySelector('#matrixchart'),svg=host.querySelector('svg'),view=svg.viewBox.baseVal;
   return {tables,chart:{width:view.width,height:view.height,hostWidth:Math.max(host.clientWidth,svg.clientWidth),hostHeight:host.clientHeight},rows:document.querySelectorAll('#matrixtable tbody tr').length};
  });
  for(const table of layout.tables)if(table.expected!=null)assert(Math.abs(table.height-table.expected)<=1,'六行半视口在重排后保持准确：'+JSON.stringify({width,...table}));
  assert(Math.abs(layout.chart.width-layout.chart.hostWidth)<=1,'图表宽度适配容器');
  assert(Math.abs(layout.chart.height-layout.chart.hostHeight)<=1,'图表高度适配容器');assert(layout.rows>0);
 }
 assert.equal(await page.locator('#riskrail .riskcard').count(),6);
 console.log('全局布局批处理、桌面/窄屏图表及六行半表格检查通过');
}
// 聚焦本次改动的表格、坐标与缩放；分级业务联动由独立业务检查负责。
export async function globalLoadViews(page){
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('a[href="#matrix"]').click();
 await verifyKeyProductDetail(page);
 await verifyKeyProductChart(page);
 await verifyKeyProductZoom(page);
 console.log('关键产品数值、表格视口、图表坐标、放大/返回与窄屏检查通过');
}
