import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const source=name=>fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8');
const product=(code,chain=0)=>({spuId:code,spuCode:code,name:'测试商品'+code,model:'型号'+code,chain});
function coreRules(){
 const calls=[],ctx=businessRuleContext({DATA_CUTOFF:'2026-10-10',shiftDate:(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10),riskRange:()=>({start:'2026-09-11',end:'2026-10-10'}),
  sdOperatingFacts:(shop,start,end)=>{calls.push({shop,start,end});return {products:shop.rows||[]}},
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  riskThumbnail:()=>'<span class="risk-thumb">品</span>',upMoney:value=>(value/1000000).toFixed(2)+'w'});
 vm.runInContext(source('risk-presentation/01-shop.js'),ctx);
 vm.runInContext(source('risk-presentation/02-shop-card.js'),ctx);
 const rows=[{product:product('C'),gsvCents:49999999},{product:product('B',1),gsvCents:50000000},{product:product('A',2),gsvCents:50000000},{product:product('D'),gsvCents:75000000},{product:product('E'),gsvCents:null}];
 const shop={id:1,rows},core=ctx.rpShopCoreFacts(shop);
 assert.deepEqual(Array.from(core.products,r=>r.product.spuCode),['D','A','B'],'恰好50w入选，低于1分钱不入选，同额按编码排序');
 assert.equal(calls[0].start,'2026-09-11');assert.equal(calls[0].end,'2026-10-10');
 ctx.rpShopCoreFacts(shop,'2026-09-15');assert.equal(calls.at(-1).start,'2026-08-17');assert.equal(calls.at(-1).end,'2026-09-15');
 ctx.rpShopCoreFacts(shop,'2026-12-31');assert.equal(calls.length,2,'未来月份不借用最新月份数据');
 assert.equal(ctx.rpShopCoreFacts(shop,'2026-12-31').available,false);
 assert.equal(core.available,true);
 ctx.rpShopCoreFacts(shop,'2026-01-15');assert.equal(calls.at(-1).start,'2025-12-17','跨年仍取结束日及前29日');
 ctx.rpShopCoreFacts(shop,'2024-03-01');assert.equal(calls.at(-1).start,'2024-02-01','闰年区间仍为30日');
 ctx.rpShopCoreFacts(shop,'2026-10-31');assert.equal(calls.at(-1).end,'2026-10-10','不外推未发生日期');
 assert.equal(ctx.rpShopCoreFacts({id:2,rows:[rows[0]]}).products.length,0,'店铺之间不串产品');
 const single=ctx.rpShopCoreMarkup(ctx.rpShopCoreFacts({id:3,rows:[rows[1]]}),'近30日GSV≥50w');
 assert.equal((single.match(/class="rp-shop-core-name"/g)||[]).length,1,'单个达标SPU仅显示一个名称');assert(!single.includes('rp-shop-core-ellipsis')); 
 // 类目采用多个主营的并集；可搜索第二、第三个主营，不回退最高销量商品。
 Object.assign(ctx,{pfSelected:value=>value==='all'||value===undefined?[]:Array.isArray(value)?value:[value],pfIncludes:(selected,value)=>selected==='all'||selected===undefined||(Array.isArray(selected)?selected:[selected]).includes(value),pfCategory:p=>['清洁类','环境类','个护类'][p.chain]});
 vm.runInContext(source('risk-presentation/03-filters.js'),ctx);
 const record={...shop,name:'测试店',shopId:'S1'},filters={brand:'all',chain:'all',shopCategory:'all',assessed:'all',qualityRisk:'all',query:''};
 assert.equal(ctx.rpFilterRows(1,[record],{...filters,chain:'环境类'}).length,1);
 assert.equal(ctx.rpFilterRows(1,[record],{...filters,chain:'厨电类'}).length,0);
 assert.equal(ctx.rpFilterRows(1,[record],{...filters,query:'型号B'}).length,1);
 assert.equal(ctx.rpFilterRows(1,[record],{...filters,query:'型号C'}).length,0);
 assert.equal(ctx.rpFilterRows(1,[{...record,rows:[]}],filters).length,1,'未达标店铺仍保留在风险榜');
 return ctx.rpShopCoreMarkup(core,'单SPU近30日GSV≥50w');
}
export async function verifyShopCoreProducts(page){
 const markup=coreRules();
 await verifyShopCoreSamples(page);
 const cell=page.locator('#rf-list-table tbody tr').first().locator('td').nth(2);
 const original=await cell.innerHTML();await cell.evaluate((node,html)=>node.innerHTML=html,markup);
 assert.deepEqual(await cell.locator('.rp-shop-core-name').allTextContents(),['测试商品D','测试商品A...']);
 assert.equal(await cell.locator('.rp-shop-core-ellipsis').count(),1);
 assert.equal(await cell.locator('img,small,details').count(),0,'单元格只展示名称，不再显示图片、码、近30日GSV或展开控件');
 const names=cell.locator('.rp-shop-core'),tip=page.locator('#metric-tooltip');
 await names.hover();await tip.waitFor({state:'visible'});
 assert.equal(await tip.innerText(),'测试商品D\n测试商品A\n测试商品B','悬浮展示全部名称且保留排序');
 assert.equal(await tip.evaluate(node=>getComputedStyle(node).whiteSpace),'pre-line');
 await tip.screenshot({path:fileURLToPath(new URL('../../outputs/shop-core-names.png',import.meta.url))});
 await page.keyboard.press('Escape');assert(await tip.isHidden());
 await names.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 assert(await names.evaluate(node=>node.getBoundingClientRect().height<=44),'名称最多占两行');
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await cell.evaluate(node=>node.scrollWidth>node.clientWidth+1),false,'主营内容不溢出单元格');
 }
 await page.setViewportSize({width:1920,height:1080});await cell.evaluate((node,html)=>node.innerHTML=html,original);
}
export async function verifyShopProductSort(page){
 const host=page.locator('.sd-detail [data-sd-spu-table]');
 const read=column=>host.locator('tbody tr').evaluateAll((rows,index)=>rows.map(row=>Number(row.cells[index].textContent.replace(/[,w%]/g,'').trim())),column);
 const codes=()=>host.locator('tbody .sd-spu-identity small').allTextContents();
 const original=await codes();assert(original.length>1);
 assert.equal(await host.locator('th').nth(1).getAttribute('aria-sort'),'descending','进入时GSV默认降序');
 assert.deepEqual(await host.locator('th').allTextContents(),['SPU信息','GSV','销量','总退','利润率']);
 for(const [key,index] of [['gsvCents',1],['netSales',2],['returnRate',3],['profitRate',4]]){
  // GSV本来就是默认降序；默认列双态切换，其他列第三次恢复默认。
  for(const direction of key==='gsvCents'?['ascending','descending']:['descending','ascending','none']){
   await host.locator('[data-rp-sort="'+key+'"]').click();
   assert.equal(await host.locator('th').nth(index).getAttribute('aria-sort'),direction);
   const values=await read(index);assert(values.every(Number.isFinite));
   if(direction!=='none')assert.deepEqual(values,[...values].sort((a,b)=>direction==='ascending'?a-b:b-a));
   else assert.deepEqual(await codes(),original,'恢复默认GSV降序');
  }
 }
 const cells=await host.locator('tr').evaluateAll(rows=>rows.map(r=>r.cells.length));assert(cells.every(n=>n===5));
 const alignment=await host.locator('tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>getComputedStyle(c).textAlign)));assert(alignment.flat().every(v=>v==='left'));
 await host.locator('[data-rp-sort="returnRate"]').click();
 await page.locator('.sd-detail [data-drawer-tab="violations"]').click();await page.locator('.sd-detail [data-drawer-tab="operating"]').click();
 assert.equal(await host.locator('th').nth(3).getAttribute('aria-sort'),'descending','切换标签保留排序');
 await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);await page.setViewportSize({width:1920,height:1080});
}

// 直接检查真实列表的演示台账与公共问号，不用临时注入行替代样例验收。
async function verifyShopCoreSamples(page){
 const table=page.locator('#rf-list-table'),help=table.locator('thead [data-rp-core-help]'),tip=page.locator('#metric-tooltip');
 const cells=table.locator('.rp-shop-core');
 assert(await table.locator('.rp-shop-core[data-rp-core-names]').count()>0,'默认列表应有超过两个主营SPU的店铺');
 const counts=await cells.evaluateAll(nodes=>nodes.map(node=>node.children.length));
 assert(counts.every(n=>n<=2),'实际列表每格最多两行名称');
 assert.equal(await table.locator('.rp-shop-core:not([data-rp-core-names]) .rp-shop-core-ellipsis').count(),0,'不超过两个名称不显示更多省略号');
 assert(await table.locator('.rp-shop-core-empty').count()>0,'保留未达标店铺的样例');
 assert.equal(await help.count(),1);assert.equal(await help.getAttribute('title'),null);
 await help.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await help.hover();await tip.waitFor({state:'visible'});assert.match(await tip.getAttribute('class'),/metric-tooltip-shop-core/);
 const textStyle=await tip.locator('.rp-core-help-threshold strong').evaluate(el=>({size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight}));
 assert.deepEqual(textStyle,{size:'12px',weight:'400'},'门槛采用普通悬浮正文大小和字重');
 assert.equal(await tip.locator('h4').innerText(),'核心主营SPU');assert.equal(await tip.locator('strong').innerText(),'近30日GSV ≥ 50w');
 assert.equal(await tip.locator('small,dl,dt,dd').count(),0,'提示只保留标题和判定门槛');assert.equal((await tip.innerText()).replace(/\s+/g,''),'核心主营SPU近30日GSV≥50w');
 await page.keyboard.press('Escape');assert(await tip.isHidden());await help.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});await help.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await help.click();
  assert(await tip.evaluate(node=>{const b=node.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight}));
  if(width===1920)await tip.screenshot({path:fileURLToPath(new URL('../../outputs/shop-core-help.png',import.meta.url))});await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await table.evaluate(node=>node.scrollLeft=0);
 await table.locator('[data-rp-sort="gsv"]').click();assert.equal(await help.count(),1,'排序重绘后问号保留');
 await table.locator('[data-rp-sort="gsv"]').click();await table.locator('[data-rp-sort="gsv"]').click();
 console.log('通过：50w边界、多/单/未达标主营样例、表头UI提示及键盘和窄屏交互');
}

// 独立覆盖主营取数与表头展示，避免依赖旧店铺榜的其他历史断言。
export async function shopCoreProducts(page){
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload();
 await page.locator('#riskrail [data-risk="1"]').click();
 const serial=page.locator('#rf-list-table thead th').first();assert.equal(await serial.innerText(),'序号');
 const width=await serial.evaluate(el=>{const r=document.createRange(),text=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode();r.selectNodeContents(text);const css=getComputedStyle(el);return {text:r.getBoundingClientRect().width,available:el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)}});
 assert(width.text<=width.available,'序号表头不截断：'+JSON.stringify(width));
 assert.equal(await page.locator('#rf-list-table thead th').nth(1).evaluate(el=>getComputedStyle(el).left),'64px','店铺固定列同步序号列宽');
 await verifyShopCoreProducts(page);await page.locator('#close').click();
}
