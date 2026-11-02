import {shortageModel} from './shortage-preview.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {businessRuleContext} from './business-rules-context.mjs';
export async function riskGroups(page){
 shortageModel();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const groups=page.locator('#riskrail>.rp-board-group');
 assert.deepEqual(await groups.locator('.rp-group-title').allTextContents(),['品质风险榜','库存风险榜']);
 assert.deepEqual(await groups.nth(0).locator('.riskcard').evaluateAll(ns=>ns.map(n=>n.dataset.rpBoard)),['0','6','1']);
 assert.deepEqual(await groups.nth(1).locator('.riskcard').evaluateAll(ns=>ns.map(n=>n.dataset.rpBoard)),['4','3']);
 assert.equal(await page.locator('#riskrail>.rp-loss-wide').count(),1);
 const shortage=page.locator('#riskrail [data-rp-board="3"]');
 const season=await shortage.locator('[data-rp-card-season="3"]').inputValue();
 const expected=await page.evaluate(season=>window.shortageRankingSnapshot().rows.filter(r=>season==='all'||r.attribute===season).map(r=>r.name),season);
 assert.deepEqual(await shortage.locator('.rp-identity b').allTextContents(),expected.slice(0,6),'缺货榜使用SKU库存快照和独立分季品排序');
 assert.equal(Number((await shortage.locator('[data-risk]').innerText()).match(/\d+/)[0]),expected.length);
 for(const width of [1920,1440,1280,1024,901,900,390,320]){
  await page.setViewportSize({width,height:1080});
  const geometry=await page.locator('#riskrail').evaluate(root=>{
   const groups=[...root.querySelectorAll(':scope>.rp-board-group')],loss=root.querySelector(':scope>.rp-loss-wide'),rect=n=>n.getBoundingClientRect();
   const headings=[...root.querySelectorAll('.rp-group-heading')].map(heading=>{const box=rect(heading),title=rect(heading.querySelector('h3'));return {centerDelta:Math.abs((title.left+title.right-box.left-box.right)/2),fits:title.left>=box.left-1&&title.right<=box.right+1}});
   const plate=rect(loss.querySelector('.rp-group-title')),actions=rect(loss.querySelector('.rp-quality-actions'));
   return {headings,actionsClear:plate.right<=actions.left-4||actions.top>=plate.bottom,overflow:root.scrollWidth-root.clientWidth,lossWidth:rect(loss).width,railWidth:rect(root).width,borders:[getComputedStyle(loss).borderLeftWidth,getComputedStyle(loss).borderRightWidth],groupOverlap:rect(groups[0]).bottom>rect(groups[1]).top,lossOverlap:rect(groups[1]).bottom>rect(loss).top,qualityTops:[...groups[0].querySelectorAll('.riskcard')].map(n=>rect(n).top),inventoryTops:[...groups[1].querySelectorAll('.riskcard')].map(n=>rect(n).top)};
  });
  assert(geometry.overflow<=1,width+'榜单区域不横向溢出');assert(Math.abs(geometry.lossWidth-geometry.railWidth)<1,'亏损榜占整行');
  assert.equal(geometry.headings.length,3);assert(geometry.headings.every(h=>h.centerDelta<=1&&h.fits),'三个铭牌居中且完整显示');assert(geometry.actionsClear,'亏损筛选与铭牌不重叠');
  assert.deepEqual(geometry.borders,['0px','0px']);assert(!geometry.groupOverlap&&!geometry.lossOverlap,'三个区域不重叠');
  assert(geometry.qualityTops.every((y,i,rows)=>!i||y>rows[i-1]),'品质三榜独占整行：'+width);
  if(width>900)assert(Math.abs(geometry.inventoryTops[0]-geometry.inventoryTops[1])<1,'库存两卡同排');
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#risk').screenshot({path:fileURLToPath(new URL('../../outputs/risk-three-groups-1920.png',import.meta.url))});
}
