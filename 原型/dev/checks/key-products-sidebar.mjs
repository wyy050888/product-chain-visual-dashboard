import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export async function keyProductSidebar(page){
 await page.locator('a[href="#matrix"]').click();const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());await clearKeyProductFilters(page);
 const original=await snapshot(),bands=[['under100',0,10000],['100-200',10000,20000],['200-300',20000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]];
 assert.equal(await root.locator('.matrixlayout>.kpm-sidebar').count(),1);assert.equal(await root.locator('.kpm-sidebar>.kpm-management,.kpm-sidebar>.kpm-price-distribution').count(),2,'分级经营与价格带两个区域');
 const assertOrder=async()=>assert.deepEqual(await root.locator('.matrixlayout').evaluate(e=>[...e.children].map(n=>n.classList.contains('kpm-sidebar')?'charts':n.classList.contains('kpm-grade-overview')?'grades':'details')),['charts','grades','details'],'两图在前，六张卡在后，明细最后');
 await assertOrder();
 assert.equal(await root.locator('.matrixlist [data-kpm-grade],.matrixlist #matrixtabs').count(),0,'删除下方重复等级筛选');
 const top=await root.locator('.matrixlayout').evaluate(el=>{const row=el.querySelector('.kpm-grade-overview').getBoundingClientRect(),cards=[...el.querySelectorAll('.kpm-structure-item')].map(n=>n.getBoundingClientRect()),body=el.querySelector('.kpm-sidebar').getBoundingClientRect();return {full:Math.abs(row.width-body.width)<1,sameRow:cards.every(r=>Math.abs(r.top-cards[0].top)<1),below:row.top>=body.bottom}});assert(top.full&&top.sameRow&&top.below,'六张卡在图表下方一行铺满宽度');
 assert.equal(await root.locator('[data-kpm-management-section=structure] .matrixplot').count(),1,'数量与矩阵位于同一结构分区');
 const parts=await root.locator('.kpm-management-section').evaluateAll(ns=>ns.map(n=>({key:n.dataset.kpmManagementSection,rect:n.getBoundingClientRect().toJSON()})));assert.deepEqual(parts.map(p=>p.key),['structure']);
 const desktopLayout=await root.evaluate(e=>{const cards=[...e.querySelectorAll('.kpm-sidebar>.kpm-management,.kpm-sidebar>.kpm-price-distribution')].map(n=>n.getBoundingClientRect()),overview=e.querySelector('.kpm-sidebar').getBoundingClientRect(),list=e.querySelector('.matrixlist').getBoundingClientRect();return {aligned:cards.every(r=>Math.abs(r.top-cards[0].top)<1&&Math.abs(r.bottom-cards[0].bottom)<1),below:list.top>=overview.bottom,full:Math.abs(list.width-overview.width)<1}});
 assert(desktopLayout.aligned&&desktopLayout.below&&desktopLayout.full,'经营区与价格带等高，明细在下方全宽展示');
 const headingRow=await root.evaluate(el=>{const titles=[el.querySelector('.kpm-chart-head h3'),el.querySelector('.kpm-price-heading h3')],center=n=>{const r=n.getBoundingClientRect();return (r.top+r.bottom)/2},styles=titles.map(n=>{const s=getComputedStyle(n);return [s.fontSize,s.fontWeight,s.color].join('|')});return {aligned:titles.every(n=>Math.abs(center(n)-center(titles[0]))<1),sameStyle:styles.every(s=>s===styles[0]),legend:Math.abs(center(el.querySelector('.kpm-chart-legend'))-center(titles[0]))<1,expand:Math.abs(center(el.querySelector('[data-kpm-expand]'))-center(titles[0]))<1}});assert(headingRow.aligned&&headingRow.sameStyle&&headingRow.legend&&headingRow.expand,'两个标题样式/基线统一，图例与放大同在标题行');

 const counts=async rows=>{assert.equal(await root.locator('.kpm-price-distribution .metric-help,.kpm-price-distribution [data-metric-rule],.kpm-price-distribution [title]').count(),0,'价格带不显示问号或悬浮提示');for(const [key,min,max] of bands){
  const items=rows.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents>=min&&p.priceCents<max),button=root.locator('[data-kpm-price-band="'+key+'"]');assert.equal(Number(await button.getAttribute('data-price-count')),items.length);
  if(!items.length){assert.equal(await button.locator('strong').innerText(),'—');assert.equal(await button.locator('[data-kpm-price-gsv]').innerText(),'—');assert.equal(await button.locator('[data-kpm-price-margin]').innerText(),'—');assert.equal(await button.locator('.kpm-price-empty').innerText(),'暂无产品');continue}
  const gsv=items.reduce((n,p)=>n+p.facts.gsvCents,0),profit=items.reduce((n,p)=>n+p.facts.profitCents,0),money=await button.locator('[data-kpm-price-gsv]').innerText(),scale=money.includes('w')?1000000:100;
  assert(Math.abs(Number(money.replace(/[^\d.-]/g,''))*scale-gsv)<=.051*scale,'价格带GSV等于当前期各产品GSV之和');
  const rate=await button.locator('[data-kpm-price-margin]').innerText();if(gsv===0)assert.match(rate,/--|—/);else assert(Math.abs(parseFloat(rate)-profit/gsv*100)<=.051,'价格带利润率使用汇总利润额÷GSV');
 }};
 await counts(original.rows);
 for(const label of ['GSV','利润率']){await root.locator('.kpm-price-heading>span').filter({hasText:label}).hover();assert(await page.locator('#metric-tooltip').isHidden(),'悬浮价格带指标不显示提示：'+label)}
 for(const [key] of bands){const before=await snapshot();await root.locator('[data-kpm-price-band="'+key+'"]').click();assert.deepEqual(await snapshot(),before,'价格带条形只展示，不筛选明细');await counts(original.rows)}
 await root.locator('[data-kpm-grade=S]').click();await counts(original.rows);await clearKeyProductFilters(page);
 await root.locator('[data-kpm-filter=brand]').selectOption([original.rows[0].brand],{force:true});await counts(original.rows.filter(p=>p.brand===original.rows[0].brand));await clearKeyProductFilters(page);
 await root.locator('[data-time-mode=quarter]').click();await counts((await snapshot()).rows);await root.locator('[data-time-mode=recent30]').click();
 const initialHeight=await root.evaluate(e=>e.offsetHeight),cardHeight=await root.locator('.kpm-management').evaluate(e=>e.offsetHeight);
 assert.equal(await root.locator('[data-kpm-management-tab]').count(),0);assert.equal(await root.locator('.kpm-management-section:visible').count(),1,'只保留产品经营矩阵');
 const structureRows=await root.locator('.kpm-structure-item[data-kpm-grade]').all();assert.deepEqual(await root.locator('.kpm-structure-level').allTextContents(),['S','A','B','C']);
 const facts=(await page.evaluate(()=>window.dashboardKeyProductManagementSnapshot())).structure;
 for(let i=0;i<structureRows.length;i++){
  const level=['S','A','B','C'][i],fact=facts.find(row=>row.level===level),row=structureRows[i];
  assert.equal(await row.locator('.kpm-structure-level').innerText(),level);assert.equal(+(await row.locator('.kpm-structure-count').innerText()),fact.count);
  assert.equal(await row.locator('.kpm-structure-delta').innerText(),fact.count===fact.before?'0':(fact.count>fact.before?'↑':'↓')+Math.abs(fact.count-fact.before));
 }
 assert.equal(await root.locator('.kpm-structure-item').count(),6);assert.equal(await root.locator('[data-kpm-grade=all]').count(),0);
 const content=root.locator('.kpm-management-body');
 const checkStructureFits=async()=>{assert(await content.evaluate(e=>e.scrollHeight<=e.clientHeight+1),'两区内容不需要内部滚动');assert.equal(await root.locator('.kpm-structure-item').count(),6);assert.equal(await root.locator('[data-kpm-management-section=structure] .kpm-management-rows').count(),0);assert(await root.locator('.kpm-structure-item').evaluateAll(ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)),'等级数量及变化完整显示')};await checkStructureFits();
 const matrixBeforeGrade=await root.locator('#matrixchart svg').evaluate(svg=>svg.outerHTML);
 for(const grade of ['S','A','B','C']){const card=root.locator('.kpm-structure-item[data-kpm-grade='+grade+']');await card.click();assert.equal((await snapshot()).grade,grade);assert((await snapshot()).visible.every(p=>p.level===grade));assert.equal(await root.locator('#matrixchart svg').evaluate(svg=>svg.outerHTML),matrixBeforeGrade,'切换等级不改变矩阵圆点、坐标及轴域');assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(await root.locator('.kpm-structure-item[data-kpm-grade] .kpm-structure-count').allTextContents().then(v=>v.map(Number).join(',')),facts.filter(f=>f.level!=='unrated').map(f=>f.count).join(','),'切换等级不改变其他卡片计数');await card.click();assert.equal((await snapshot()).grade,'all')}
 assert.equal(await root.locator('[data-kpm-grade=unrated]').count(),0,'移除右上角未分级入口');await root.locator('[data-kpm-grade=S]').click();await clearKeyProductFilters(page);assert.equal((await snapshot()).visible.length,original.visible.length);assert.equal(await root.locator('.kpm-management').evaluate(e=>e.offsetHeight),cardHeight);
 await root.locator('[data-kpm-grade=S]').click();const chartIds=await root.locator('#matrixchart circle').evaluateAll(ns=>ns.map(n=>n.dataset.kpmPoint).sort());
 await root.locator('[data-kpm-expand]').click();assert.deepEqual((await page.evaluate(()=>dashboardKeyProductZoomSnapshot())).points.sort(),chartIds,'放大图不继承等级卡');assert.equal(await root.locator('.kpm-chart-zoom .kpm-price-distribution,.kpm-chart-zoom .kpm-management').count(),0);assert.equal(await root.locator('.kpm-sidebar .kpm-price-distribution').count(),1);await page.keyboard.press('Escape');assert.equal(await root.locator('.kpm-sidebar [data-kpm-management-section=structure]>.matrixplot').count(),1);await assertOrder();assert.equal(await root.locator('#matrixchart svg').evaluate(svg=>svg.outerHTML),matrixBeforeGrade,'关闭放大后恢复完整矩阵');await clearKeyProductFilters(page);
 for(const width of [1920,1100,390]){await page.setViewportSize({width,height:1080});assert(await root.locator('.kpm-sidebar').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'左侧卡片不溢出 '+width);assert(await root.locator('.kpm-price-distribution').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'价格带指标不溢出 '+width);assert(await root.locator('[data-kpm-price-band]').evaluateAll(ns=>ns.every(e=>e.scrollWidth<=e.clientWidth+1)),'价格带各行完整显示 '+width);await root.locator('.kpm-price-distribution').screenshot({path:fileURLToPath(new URL('../../outputs/key-product-price-metrics-'+width+'.png',import.meta.url))});await checkStructureFits();await root.locator('.kpm-management').screenshot({path:fileURLToPath(new URL('../../outputs/key-product-structure-'+width+'.png',import.meta.url))});}await page.setViewportSize({width:1920,height:1080});
 await root.locator('.kpm-sidebar').screenshot({path:fileURLToPath(new URL('../../outputs/key-products-sidebar.png',import.meta.url))});
 const target=(await snapshot()).visible[0];await root.locator('#matrixtable [data-kpm-detail="'+target.spuId+'"]').click();const detail=page.locator('.up-detail'),price=detail.locator('[data-up-guide-price]');await detail.waitFor();
 const source=fs.readFileSync(fileURLToPath(new URL('../../src/data/product-guide-prices.js',import.meta.url)),'utf8'),guide=JSON.parse(source.slice(source.indexOf('{'),source.lastIndexOf('}')+1))[target.spuId];
 assert.equal(await price.innerText(),(guide/100).toFixed(2));assert.match(await detail.locator('.up-guide-price').innerText(),/指导价：[\s\S]*元/);
 const projectBox=await detail.locator('[data-up-project]').boundingBox(),priceBox=await price.boundingBox();assert(priceBox.y>projectBox.y,'指导价位于项目链接下方');
 for(const platform of ['抖音','天猫','all']){await detail.locator('#up-platform').selectOption(platform,{force:true});assert.equal(await price.innerText(),(guide/100).toFixed(2),'指导价不随平台改变')}
 await page.locator('.up-detail-period [data-drawer-time-mode=month]').click();assert.equal(await price.innerText(),(guide/100).toFixed(2),'指导价不随期间改变');
 await detail.locator('.up-hero').screenshot({path:fileURLToPath(new URL('../../outputs/product-guide-price.png',import.meta.url))});
 await page.setViewportSize({width:390,height:844});assert(await detail.locator('.up-identity-row').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await price.isVisible());await page.locator('#close').click();await page.setViewportSize({width:1920,height:1080});
}
