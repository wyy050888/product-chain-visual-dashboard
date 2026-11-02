import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const modules=['risk','ai','sales','new','projects','lifecycle','matrix','inventory','suppliers','cost'];
const size=(locator)=>locator.evaluate(el=>getComputedStyle(el).fontSize);
export async function typography(page){
 const issues=[];
 for(const width of [1920,1440,900,390]){
  await page.setViewportSize({width,height:1080});
  for(const id of modules){
   await page.locator(`.jumpnav a[href="#${id}"]`).click();
   const root=page.locator('#'+id);
   assert.equal(await size(root.locator(':scope>.sectionhead h2')),'20px',id+'模块标题');
   const bounds=await root.evaluate(el=>({right:el.getBoundingClientRect().right,overflow:el.scrollWidth-el.clientWidth}));
   if(bounds.right>width+1||bounds.overflow>2)issues.push(`${id}/${width}px外层溢出：${JSON.stringify(bounds)}`);
   if(id==='inventory'){const crowded=await root.locator('.stock-balance-card').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className));if(crowded.length)issues.push(id+'/'+width+'库存卡片内容溢出：'+crowded.join(','))}
   const main=await root.locator('table :is(th,td)').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).fontSize!=='14px').slice(0,4).map(e=>[e.textContent.slice(0,20),getComputedStyle(e).fontSize]));
   if(main.length)issues.push(id+'/'+width+'表格正文：'+JSON.stringify(main));
   const meta=await root.locator('small,.period-range').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>getComputedStyle(e).fontSize));
   if(meta.some(value=>value!=='12px'))issues.push(id+'/'+width+'辅助字号：'+[...new Set(meta)].join(','));
   if(width===1920&&['risk','new','projects','inventory','suppliers'].includes(id)){
    await root.locator(':scope>.sectionhead').scrollIntoViewIfNeeded();
    await page.screenshot({path:fileURLToPath(new URL(`../../outputs/typography-${id}-1920.png`,import.meta.url))});
   }
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 for(const selector of ['.nsp-details-title','.kpm-structure-heading h3','.pp-details-heading h3','.pp-ai-heading h3'])assert.equal(await size(page.locator(selector)),'18px','明细分区标题');
 for(const selector of ['#inventory .ip-brand-share-card>h3','#inventory .ip-group-panel h3','#inventory .ip-stagnant-heading h3'])assert(await page.locator(selector).evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).fontSize==='18px')),'库存同级分区标题18px');
 for(const selector of ['#newtop .nsp-distribution>h3','#pp-overview .pp-card-head h3','#cost .cc-card h3'])assert.equal(await size(page.locator(selector).first()),'16px','图表/卡片标题');
 assert.equal(await size(page.locator('#inventory [data-stock-turn]')),'24px','紧凑库存指标与其他库存卡一致');
 for(const selector of ['.nsp-success-target','.pp-root-rank','.ms-delta-label','#inventory .stock-season-legend>span','.cc-card .cc-money-unit']){const node=page.locator(selector).first();if(await node.count())assert.equal(await size(node),'12px','辅助字号 '+selector)}
 await page.locator('a[href="#new"]').click();await page.locator('[data-nsp-view]').first().click();
 assert.equal(await size(page.locator('#dialogtitle')),'20px','抽屉标题');
 assert.equal(await size(page.locator('#dialogbody .up-hero h2')),'16px','产品身份标题');
 assert(await page.locator('#dialogbody .up-metric strong').evaluateAll(es=>es.filter(e=>e.getClientRects().length).every(e=>getComputedStyle(e).fontSize==='24px')),'产品详情指标');
 for(const width of [1920,900,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1),'抽屉不溢出')}
 await page.locator('#close').click();
 assert.deepEqual(issues,[],'全局字体及布局异常：'+issues.join('；'));
 await page.setViewportSize({width:1920,height:1080});
}
