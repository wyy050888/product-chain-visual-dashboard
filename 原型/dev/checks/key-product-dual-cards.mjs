import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {businessRuleContext} from './business-rules-context.mjs';

export async function keyProductDualCards(page){
 const ctx=businessRuleContext({window:{}});
 for(const [mode,factor] of [['recent30',1],['month',1],['quarter',3],['year',12]]){
  for(const [sales,grade] of [[601,'S'],[600,'A'],[301,'A'],[300,'B'],[60,'B'],[59,'C']]){
   for(const profit of [-20,0,12,16,null])assert.equal(ctx.brcProductGrade(sales*factor,profit,mode),grade,'规模等级不受利润率影响');
   const zones=ctx.brcGradeSalesRanges(grade,null,mode);assert(zones.some(r=>ctx.brcRangeHas(r,sales*factor)));
  }
 }
 assert.equal(ctx.brcProductOperatingMatch('S',12),false);assert.equal(ctx.brcProductOperatingMatch('S',12.1),true);assert.equal(ctx.brcProductOperatingMatch('S',null),false);
 assert.equal(ctx.brcProductGrade(null,20,'month'),null);
 // 旧条件轴归一保留合法阈值，不覆盖其他业务配置。
 const defaults=ctx.brcDefaultConditions(vm.runInContext('brcDefaults',ctx)),old=ctx.brcCopyConditions(defaults);
 old['grades.S.salesAbove']={op:'all',conditions:[{op:'gt',a:650,metric:'gsv'},{op:'gt',a:20,metric:'profitRate'}]};
 ctx.brcNormalizeGradeAxes(old,defaults);assert.equal(ctx.brcPredicateTest(old['grades.S.salesAbove'],'gsv',{gsv:651}),true);

 await page.setViewportSize({width:1920,height:1080});
 await page.locator('a[href="#matrix"]').click();await page.locator('#matrix .kpm-dual-card').first().waitFor();
 const root=page.locator('#matrix'),snap=()=>page.evaluate(()=>dashboardKeyProductsSnapshot());
 await root.locator('.kpm-dual-card').first().waitFor();
 const verify=async()=>{
  const data=await snap();assert.equal(await root.locator('.kpm-structure-item').count(),6);
  assert.equal(await root.locator('[data-kpm-summary-change]').count(),2);
  for(const grade of ['S','A','B','C']){
   const card=root.locator('[data-kpm-card-grade='+grade+']');
   const facts=data.structure.find(row=>row.level===grade);
   const items=data.base.filter(p=>p.level===grade),previous=data.base.filter(p=>p.assessment.previous.level===grade);
   assert.equal(facts.count,items.length);assert.equal(facts.before,previous.length);
   const operating=items.filter(p=>ctx.brcProductOperatingMatch(grade,p.assessment.current.profitRate)).map(p=>p.spuId);
   assert.deepEqual(facts.operating.ids.sort(),operating.sort());
   assert.equal(await card.locator('.kpm-structure-count').innerText(),String(facts.count));
   assert.equal(await card.locator('.kpm-operating-count').innerText(),String(operating.length));
   assert.equal(await card.locator('.kpm-metric-comparison').count(),2);
   for(const [selector,now,before] of [['.kpm-scale-metric',facts.count,facts.before],['.kpm-operating-metric',facts.operating.count,facts.operating.before]]){
    assert.equal(await card.locator(selector+' .kpm-structure-delta').innerText(),now===before?'持平':(now>before?'↑':'↓')+Math.abs(now-before));
   }
  }
  assert(await root.locator('.kpm-structure-metric').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),'两组指标完整显示');
  assert(await root.locator('.kpm-structure-metric').evaluateAll(nodes=>nodes.every(n=>{
   const [title,quantity,comparison]=[...n.children].map(child=>child.getBoundingClientRect());
   return title.right<=quantity.left+1&&quantity.right<=comparison.left+1;
  })),'名称、数量、较上期三列不重叠');
  assert(await root.locator('.kpm-dual-card').evaluateAll(nodes=>nodes.every(n=>{
   const [scale,operating]=[...n.children].map(child=>child.getBoundingClientRect());
   return scale.bottom<=operating.top+1&&Math.abs(scale.left-operating.left)<1;
  })),'每张卡上下展示两组指标');
 };
 await verify();
 const metric=root.locator('[data-kpm-grade=S]');
 const appearance=()=>metric.evaluate(n=>({background:getComputedStyle(n).backgroundColor,shadow:getComputedStyle(n).boxShadow}));
 const parent=root.locator('[data-kpm-card-grade=S]');
 const parentBackground=await parent.evaluate(n=>getComputedStyle(n).backgroundColor);
 await metric.hover();await page.waitForTimeout(180);const hovering=await appearance();
 assert.equal(await parent.evaluate(n=>getComputedStyle(n).backgroundColor),parentBackground,'悬浮仅作用于当前指标，不染色整张卡');
 await metric.click();await root.locator('.kpm-structure-heading').hover();await page.waitForTimeout(180);
 const selected=await appearance();assert.notEqual(selected.background,hovering.background,'悬浮与选中背景不同');assert.equal(selected.shadow,'none','选中不加边框阴影');
 await metric.hover();await page.waitForTimeout(180);assert.deepEqual(await appearance(),selected,'选中后的悬浮保留选中样式');
 await metric.click();
 // 利润关注区域与当前规则一致，参考线有独立、清晰的描边。
 ctx.kpmGradeOrder=['S','A','B','C'];vm.runInContext(fs.readFileSync(new URL('../../src/modules/key-products/02-chart.js',import.meta.url),'utf8'),ctx);
 for(const mode of ['month','quarter','year']){
  const areas=ctx.kpmChartOperatingRegions(mode);
  for(const grade of ['S','A','B','C'])for(const profit of [-20,10,13,16,20]){
   assert.equal(areas.some(a=>a.grade===grade&&ctx.brcRangeHas(a.profit,profit)),ctx.brcProductOperatingMatch(grade,profit));
  }
 }
 for(const value of [12,15]){
  const line=root.locator('#matrixchart [data-kpm-profit-reference="'+value+'"]');
  assert.equal(await line.count(),1);assert.equal(await line.getAttribute('stroke-width'),'1.5');
 }
 const areas=await root.locator('#matrixchart [data-kpm-operating-area]').evaluateAll(nodes=>nodes.map(n=>({grade:n.dataset.kpmOperatingArea,x:+n.getAttribute('x'),y:+n.getAttribute('y'),w:+n.getAttribute('width'),h:+n.getAttribute('height'),fill:n.getAttribute('fill')})));
 for(const area of areas){
  const zone=await root.locator('#matrixchart [data-quadrant="'+area.grade+'"]').evaluate(n=>({x:+n.getAttribute('x'),y:+n.getAttribute('y'),w:+n.getAttribute('width'),h:+n.getAttribute('height'),fill:n.getAttribute('fill')}));
  assert.notEqual(area.fill,zone.fill);assert.equal(area.x,zone.x);assert.equal(area.w,zone.w);
  assert(area.y>=zone.y&&area.y+area.h<=zone.y+zone.h+.01);
 }
 const verifyLabels=async()=>{
  for(const grade of ['S','A','B','C']){
   const label=root.locator('#matrixchart [data-kpm-zone-label="'+grade+'"]');
   assert.equal(await label.textContent(),grade+'级');assert(await label.isVisible());
  }
  assert(await root.locator('#matrixchart [data-kpm-zone-label=C]').evaluate(n=>{
   const label=n.getBBox(),zone=n.ownerSVGElement.querySelector('[data-quadrant=C]');
   return label.x>=+zone.getAttribute('x')-1&&label.x+label.width<=+zone.getAttribute('x')+ +zone.getAttribute('width')+1;
  }),'C级窄区域标签完整且不跨入B区');
 };
 const verifyPointTones=async()=>{
  const current=await snap(),nodes=await root.locator('#matrixchart [data-kpm-point]').evaluateAll(items=>items.map(n=>({id:n.dataset.kpmPoint,tone:n.dataset.kpmPointTone,opacity:n.getAttribute('fill-opacity')})));
  for(const node of nodes){
   const row=current.base.find(p=>p.spuId===node.id),matched=!!row.level&&ctx.brcProductOperatingMatch(row.level,row.assessment.current.profitRate);
   assert.equal(node.tone,!row.level?'unrated':matched?'matched':'unmatched');
   assert.equal(node.opacity,row.level&&!matched?'.28':'.95');
  }
  assert(!(await root.locator('.kpm-chart-legend').innerText()).includes('深色：'),'图例不显示深浅颜色说明文字');
 };
 await verifyLabels();await verifyPointTones();await root.locator('[data-kpm-expand]').click();await verifyLabels();await verifyPointTones();
 await root.locator('.kpm-chart-zoom').screenshot({path:fileURLToPath(new URL('../../outputs/关键产品矩阵完整等级-检查.png',import.meta.url))});
 await root.locator('[data-kpm-expand]').click();
 for(const grade of ['S','A','B','C']){
  await root.locator('[data-kpm-grade='+grade+']').click();assert((await snap()).visible.every(p=>p.level===grade));
  await root.locator('[data-kpm-operating='+grade+']').click();
  const actual=await snap(),expected=actual.base.filter(p=>p.level===grade&&ctx.brcProductOperatingMatch(grade,p.assessment.current.profitRate)).map(p=>p.spuId).sort();
  assert.deepEqual(actual.visible.map(p=>p.spuId).sort(),expected);
  await verify();await root.locator('[data-kpm-operating='+grade+']').click();assert.equal((await snap()).grade,'all');
 }
 await root.locator('[data-kpm-summary-change=up]').click();assert.equal((await snap()).operating,null);assert((await snap()).visible.every(p=>p.assessment.change==='up'));
 await root.locator('[data-kpm-summary-change=up]').click();
 ctx.kpmGradeOrder=['S','A','B','C'];vm.runInContext(fs.readFileSync(new URL('../../src/modules/key-products/14-management-model.js',import.meta.url),'utf8'),ctx);
 const sample=(level,profit)=>({level,profitRate:profit,gsvCents:700000000,sales:1});
 const rows=[{spuId:'sample',level:'S',facts:{gsvCents:700000000,profitCents:100},assessment:{current:sample('S',16),previous:sample('S',10)}}];
 const independent=ctx.kpmManagementStructure(rows).find(row=>row.level==='S');assert.equal(independent.count,independent.before);assert.equal(independent.operating.count,1);assert.equal(independent.operating.before,0);
 for(const width of [1920,1440,1000,700,390]){await page.setViewportSize({width,height:1080});await verify()}
 await page.setViewportSize({width:1920,height:1080});
 fs.mkdirSync(new URL('../../outputs/',import.meta.url),{recursive:true});
 await root.locator('#matrixchart').screenshot({path:fileURLToPath(new URL('../../outputs/关键产品利润关注区域-检查.png',import.meta.url))});
 await root.locator('.kpm-structure-summary').screenshot({path:fileURLToPath(new URL('../../outputs/关键产品双指标卡片-检查.png',import.meta.url))});
 // SABC等级与经营标签使用统一来源，后台不再提供本地编辑入口。
 await page.evaluate(()=>{location.hash='#system-business-rules'});
 await page.locator('#business-rule-page').waitFor({state:'visible'});
 await page.locator('[data-brc-tab=new]').click();
 assert.equal(await page.locator('[data-brc-section-tab=grade]').count(),0);
 assert.equal(await page.locator('[data-brc-metric^="grades."]').count(),0);
 await page.evaluate(()=>location.hash='#matrix');
 console.log('通过：仅GSV评级、经营标签独立统计及环比、六卡筛选、五档宽度、无本地SABC编辑入口。');
}
