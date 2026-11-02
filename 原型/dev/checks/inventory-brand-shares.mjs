import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

export async function inventoryBrandShares(page){
 const names=['苏泊尔','美的','创维','海尔','康佳','其他品牌'];
 const ctx=vm.createContext({filterCatalog:{dashboardBrands:names.slice(0,5)},targetSum:values=>values.reduce((a,b)=>a+b,0)});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/inventory-period/02-brand-share-model.js',import.meta.url),'utf8'),ctx);
 const fixture=[{brandName:'创维',goodsValueCents:300},{brandName:'康佳',goodsValueCents:100},{brandName:'其他原始品牌',goodsValueCents:100}];
 const model=ctx.ipBrandShareModel(fixture,'goodsValueCents');assert.equal(model.total,500);assert.equal(model.rows.find(row=>row.name==='其他品牌').value,100);assert.equal(model.rows[0].name,'创维');assert.equal(model.rows[0].share,60);
 assert.deepEqual(Array.from(model.rows,row=>row.name),['创维','康佳','其他品牌','苏泊尔','美的','海尔'],'按原始占比降序，同值保留品牌顺序，零值置后');
 const alternate=ctx.ipBrandShareModel([{brandName:'创维',warehouseValueCents:80},{brandName:'康佳',warehouseValueCents:400}],'warehouseValueCents');
 assert.equal(alternate.rows[0].name,'康佳','两图按自身占比独立排序');assert.equal(alternate.rows.find(row=>row.name==='创维').color,model.rows[0].color,'排序不改变品牌颜色');
 assert(ctx.ipBrandShareModel([],'goodsValueCents').rows.every(row=>row.value===0&&row.share===null),'全零不绘制虚假比例');
 await page.locator('a[href="#inventory"]').click();
 const charts=page.locator('#inventory-brand-shares'),snapshot=()=>page.evaluate(()=>inventoryControlAudit());
 assert.deepEqual(await charts.locator('h3').allTextContents(),['总库存货值-品牌占比','我司可售货值-品牌占比']);
 const sizes=await charts.evaluate(root=>({titles:[...root.querySelectorAll('h3')].map(n=>getComputedStyle(n).fontSize),totals:[...root.querySelectorAll('.ip-brand-share-center>strong')].map(n=>getComputedStyle(n).fontSize),rows:[...root.querySelectorAll('.ip-brand-share-row')].map(n=>[...n.children].map(cell=>getComputedStyle(cell).fontSize)),columns:[...root.querySelectorAll('.ip-brand-share-columns')].map(n=>getComputedStyle(n).fontSize),meta:[...root.querySelectorAll('.ip-brand-share-center>span')].map(n=>getComputedStyle(n).fontSize)}));
 assert(sizes.titles.every(size=>size==='18px'));assert(sizes.totals.every(size=>size==='24px'));assert(sizes.rows.every(row=>row.join(',')==='13px,14px,14px'));assert(sizes.columns.every(size=>size==='13px'));assert(sizes.meta.every(size=>size==='12px'));
 const framing=await page.locator('#inventory').evaluate(root=>({cards:[...root.querySelectorAll('.stock-summary-card')].map(node=>getComputedStyle(node).borderTopWidth),frames:[...root.querySelectorAll('.ip-brand-share-card,.ip-group-panel,.ip-stagnant-panel')].map(node=>getComputedStyle(node).borderTopWidth),tables:[...root.querySelectorAll('.ip-group-scroll,.ip-stagnant-scroll')].map(node=>({shared:node.classList.contains('tablewrap'),border:getComputedStyle(node).borderTopWidth}))}));
 assert.equal(framing.cards.length,7);assert(framing.cards.every(width=>width==='1px'),'库存七项使用独立卡片');assert(framing.frames.every(width=>width==='0px'),'图表/分区不增加重复卡框');assert(framing.tables.every(node=>node.shared&&node.border==='1px'),'表格保留全局tablewrap边界');
 async function verify(){
  const data=await snapshot();
  for(const [key,model] of [['goodsValueCents',data.brandShares.total],['warehouseValueCents',data.brandShares.warehouse]]){
   const chart=charts.locator('[data-ip-brand-chart="'+key+'"]');
   assert.equal(model.total,data.balance[key],'图表与顶部卡片全量货值守恒');
   assert.equal(model.rows.reduce((sum,row)=>sum+row.value,0),model.total);
   assert.deepEqual(model.rows.map(row=>row.name).sort(),[...names].sort());
   assert(model.rows.every((row,index)=>!index||model.rows[index-1].value>=row.value),'占比按原值降序');
   if(model.total>0)assert(Math.abs(model.rows.reduce((sum,row)=>sum+row.share,0)-100)<1e-8);
   const rows=await chart.locator('[data-ip-share-brand]').evaluateAll(nodes=>nodes.map(node=>({name:node.dataset.ipShareBrand,value:+node.dataset.value,share:node.dataset.share===''?null:+node.dataset.share,color:getComputedStyle(node.querySelector('i')).backgroundColor})));
   assert.deepEqual(rows.map(({name,value,share})=>({name,value,share})),model.rows.map(({name,value,share})=>({name,value,share})));
   assert.equal(await chart.locator('[data-ip-brand-arc]').count(),model.rows.filter(row=>row.share>0).length);
   assert.deepEqual(await chart.locator('[data-ip-brand-arc]').evaluateAll(nodes=>nodes.map(node=>node.dataset.ipBrandArc)),model.rows.filter(row=>row.share>0).map(row=>row.name),'环形扇区与明细顺序一致');
   const rgb=hex=>'rgb('+[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16)).join(', ')+')';
   assert(rows.every((row,index)=>row.color===rgb(model.rows[index].color)),'图例色块与环形扇区颜色同源');
  }
  assert.deepEqual(names.map(name=>data.brandShares.total.rows.find(row=>row.name===name).color),names.map(name=>data.brandShares.warehouse.rows.find(row=>row.name===name).color),'两图同一品牌颜色一致');
 }
 await verify();const initial=(await snapshot()).brandShares;
 await verifyBrandShareHover(page,charts,initial);
 for(const mode of ['quarter','year','month']){await page.locator('#inventory>.sectionhead [data-ip-time-mode="'+mode+'"]').click();await verify();assert.deepEqual((await snapshot()).brandShares,initial,'经营期间不改写最新库存货值')}
 const select=page.locator('#inventory .ip-season-filter select');
 await select.selectOption('夏季品',{force:true});await verify();assert.notEqual((await snapshot()).brandShares.total.total,initial.total.total,'季品筛选重算货值');
 await select.selectOption('all',{force:true});await verify();assert.deepEqual((await snapshot()).brandShares,initial);
 for(const width of [1920,1440,1100,1024,550,390,320]){
  await page.setViewportSize({width,height:1080});
  const layout=await charts.evaluate(root=>({overflow:root.scrollWidth-root.clientWidth,cards:[...root.children].map(card=>{const r=card.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,overflow:card.scrollWidth-card.clientWidth}}),metrics:document.querySelector('#inventorymetrics').getBoundingClientRect().bottom,table:document.querySelector('#inventorytable').getBoundingClientRect().top}));
  assert(layout.overflow<=1&&layout.cards.every(card=>card.overflow<=1),'图表内容不横向溢出 '+width);
  assert(layout.cards[0].top>=layout.metrics&&layout.cards[1].bottom<=layout.table,'图表位于指标卡和明细之间');
  if(width>1100)assert(Math.abs(layout.cards[0].top-layout.cards[1].top)<1&&Math.abs(layout.cards[0].bottom-layout.cards[1].bottom)<1,'桌面两卡并排等高');
  else assert(layout.cards[1].top>=layout.cards[0].bottom,'窄屏两图堆叠');
 }
 await page.setViewportSize({width:390,height:1080});await verifyBrandShareHover(page,charts,initial);
 await page.setViewportSize({width:1920,height:1080});
 await charts.screenshot({path:fileURLToPath(new URL('../../outputs/inventory-brand-shares-1920.png',import.meta.url))});
 await page.locator('#inventory').screenshot({path:fileURLToPath(new URL('../../outputs/inventory-open-layout-1920.png',import.meta.url))});
 console.log('通过：库存品牌双图全量守恒、其他品牌/零值、季品/期间、颜色一致及响应式布局');
}

async function verifyBrandShareHover(page,charts,models){
 const tooltip=page.locator('#metric-tooltip');
 for(const [key,model] of [['goodsValueCents',models.total],['warehouseValueCents',models.warehouse]]){
  const chart=charts.locator('[data-ip-brand-chart="'+key+'"]'),svg=chart.locator('svg');
  await svg.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(120);
  const box=await svg.boundingBox();let offset=0;
  for(const row of model.rows){
   if(!(row.share>0))continue;
   const angle=(offset+row.share/2)/100*Math.PI*2-Math.PI/2;
   await page.mouse.move(box.x+(96+74*Math.cos(angle))/192*box.width,box.y+(96+74*Math.sin(angle))/192*box.height);
   await tooltip.waitFor({state:'visible'});
   const value=(row.value/1000000).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
   assert.equal(await tooltip.locator('.ip-share-tip-brand strong').textContent(),row.name,'实际扇区悬浮品牌匹配');
   assert.deepEqual(await tooltip.locator('dt').allTextContents(),['货值','占比']);
   assert.deepEqual(await tooltip.locator('dd b').allTextContents(),[value,row.share.toFixed(1)+'%'],'悬浮数值与明细同源');
   const appearance=await tooltip.evaluate(node=>({radius:getComputedStyle(node).borderRadius,shadow:getComputedStyle(node).boxShadow,values:[...node.querySelectorAll('dd b')].map(n=>getComputedStyle(n).fontSize),labels:[...node.querySelectorAll('dt')].map(n=>getComputedStyle(n).fontSize),dot:getComputedStyle(node.querySelector('.ip-share-tip-brand i')).backgroundColor,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}));
   assert.equal(appearance.radius,'10px');assert.notEqual(appearance.shadow,'none');assert(appearance.values.every(size=>size==='14px'));assert(appearance.labels.every(size=>size==='12px'));
   const color='rgb('+[1,3,5].map(start=>parseInt(row.color.slice(start,start+2),16)).join(', ')+')';assert.equal(appearance.dot,color,'品牌色点与扇区一致');
   assert(appearance.left>=8&&appearance.right<=page.viewportSize().width-8,'浮层保持在视口内');
   if(key==='goodsValueCents'&&offset===0)await tooltip.screenshot({path:fileURLToPath(new URL('../../outputs/inventory-brand-tooltip-'+page.viewportSize().width+'.png',import.meta.url))});
   await page.keyboard.press('Escape');offset+=row.share;
  }
  const arc=chart.locator('[data-ip-brand-arc]').first();await arc.focus();await tooltip.waitFor({state:'visible'});
  assert.equal(await tooltip.locator('.ip-share-tip-brand strong').textContent(),model.rows.find(row=>row.share>0).name,'键盘聚焦同样可读');
  await page.mouse.move(0,0);await arc.evaluate(node=>node.blur());await tooltip.waitFor({state:'hidden'});
 }
 console.log('通过：两图所有非零扇区实际悬浮、货值/占比同源、键盘聚焦及离开关闭');
}
