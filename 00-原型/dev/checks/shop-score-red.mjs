import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyShopScoreRed(){
 const catalog=[],ctx=businessRuleContext({window:{},klcCatalog:catalog,sampleSpus:[],dashboardSyncDate:()=> '2026-10-28',riskRange:()=>({end:'2026-10-28'}),DATA_CUTOFF:'2026-10-28',fmt:String});
 const read=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 vm.runInContext(read('core-link-config/01-model.js'),ctx);
 ctx.klcRows=()=>catalog.map(row=>({...row,monitorMonth:'2026-10'}));
 ctx.rpShopScoreTone=(platform,score,shop)=>'rp-quality-'+ctx.brcBandTone('score.'+platform,score,shop);
 const scoring=read('shop-scoring/01.js');
 vm.runInContext('const sbRuleConfig={pddConfirmed:true};'+scoring.slice(scoring.indexOf('function sbScoreRisk'),scoring.indexOf('function sbAllShops')),ctx);
 const confirmed=read('product-filters/03-confirmed-risk.js');
 vm.runInContext(confirmed.slice(confirmed.indexOf('const rpDecideBeforeConfirmed'),confirmed.indexOf('sbReturnRisk=function')),ctx);
 const shop={shopId:'1',channel:'拼多多',score:5,end:'2026-10-28',qualityPenaltyCount:2,qualityFine:0,frozenAmount:0,returnProducts:[]};
 const link=(hits,index=0)=>({shopId:'1',linkId:String(100+index),name:'核心链接',metrics:[0,1,2].map(i=>({name:'指标'+i,thirdValue:i*2<hits?31:30,mainValue:i*2+1<hits?31:30}))});
 const ratingHit=row=>ctx.sbDecide(row).signals.some(signal=>signal.label.startsWith('店铺评分红灯'));
 for(const count of [0,1,2,3,4,6]){
  catalog.splice(0,catalog.length,link(count));
  assert.equal(ctx.klcAssessedLinks(shop)[0].redCount,count,'30%边界不命中');
  assert.equal(ctx.sbScoreRisk(shop),count>=3?'red':null,'单链接异常项数 '+count);
  assert.equal(ratingHit(shop),count>=3);
  assert.equal(ctx.sbDecide({...shop,qualityPenaltyCount:1}).color,'green','拼多多红灯仍与处罚门槛同时满足');
 }
 catalog.splice(0,catalog.length,link(2),link(2,1));assert.equal(ratingHit(shop),false,'不同链接的异常项数不能累加');
 catalog.length=0;assert.equal(ratingHit(shop),false,'未配置链接不根据拼多多评分猜测');
 for(const [score,expected] of [[4.5,true],[4.7,false],[4.9,false]])assert.equal(ratingHit({...shop,channel:'抖音',score}),expected,'仅红灯与处罚共同触发');
 for(const score of [0,3,5]){
  const video={...shop,channel:'视频号',score};
  assert.equal(ctx.sbScoreRisk(video),null,'视频号评分不判灯');
  assert.equal(ctx.sbShopScoreCompare(video,{...shop,channel:'抖音',score:5}),1,'同风险条件下视频号评分按不适用处理，与原始分值无关');
  assert.equal(ctx.sbShopScoreCompare({...shop,channel:'抖音',score:5},video),-1,'跨平台比较不使用视频号分数');
  assert.equal(ctx.sbDecide(video).color,'green','视频号不因低分和处罚次数入榜');
  assert.equal(ctx.sbDecide({...video,qualityFine:6000}).color,'red','视频号罚款条件仍有效');
 }
 catalog.push(link(0));
 assert.equal(ctx.sbDecide({...shop,qualityFine:6000}).color,'red','独立罚款条件保持');
 assert.equal(ctx.sbDecide({...shop,frozenAmount:1}).color,'red','独立冻结条件保持');
}
export async function shopScoreRed(page){
 verifyShopScoreRed();
 const card=page.locator('#riskrail .rp-shop-card'),help=card.locator('.card-metric-help').first();
 await help.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await help.focus();const pop=page.locator('#metric-tooltip');await pop.waitFor({state:'visible'});
 const text=await pop.innerText();assert.match(text,/店铺评分红灯，且品质违规处罚/);assert.match(text,/异常项数≥3项，等同于店铺评分红灯/);assert(!text.includes('店铺评分异常'));
 assert.match(text,/视频号：暂不监控店铺分/);
 assert.deepEqual(await pop.locator('.rp-shop-score-rules tbody th').allTextContents(),['抖音','快手','天猫','京东']);
 await page.keyboard.press('Escape');
 const rows=await page.evaluate(()=>shopRiskAudit());
 for(const shop of rows){
  const hit=shop.signals.some(signal=>signal.label.startsWith('店铺评分红灯'));
  if(shop.channel==='视频号')assert.equal(hit,false,'视频号无评分风险');
  if(shop.channel==='拼多多'){
   const links=await page.evaluate(id=>pddShopLinksSnapshot(id).all,shop.id);
   assert.equal(hit,links.some(link=>link.assessment==='red')&&shop.qualityPenaltyCount>=2);
  }
  assert(!shop.signals.some(signal=>signal.label.startsWith('核心链接中')),'拼多多链接不再绕过共同处罚条件');
 }
 await card.locator('[data-risk="1"]').click();await page.locator('[data-rp-reset]').click();await page.locator('#rf-list-platform').selectOption('拼多多',{force:true});
 const expected=rows.filter(shop=>shop.channel==='拼多多'&&shop.color!=='green');
 assert.equal(Number(await page.locator('#rp-list-pagination nav').getAttribute('data-list-total')),expected.length,'完整榜单与最终店铺判定同源');
 const table=page.locator('#rf-list-table');assert.equal(await table.locator('[data-rp-sort="score"]').count(),0,'拼多多不展示虚拟店铺分');
 if(expected.length){await table.getByRole('button',{name:'查看详情',exact:true}).first().click();await page.locator('.sd-detail').waitFor();assert.equal(await page.locator('.sd-detail [data-sd-scores] [data-rp-field="redLinks"]').count(),1);await page.locator('#close').click()}
 await page.locator('#close').click();
 console.log('通过：店铺评分红灯说明、拼多多0/1/2/3/6项边界、单链接独立计数、处罚共同条件及罚款/冻结独立条件。');
}
