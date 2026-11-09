import assert from 'node:assert/strict';

export async function newProductDetail(page){
 await page.locator('a[href="#new"]').click();
 await page.locator('#time-new [data-time-mode="quarter"]').click();
 await page.locator('#time-new [data-time-value]').selectOption('4',{force:true});
 await verifyNewProductDetail(page);
}
export async function verifyNewProductDetail(page){
 const data=await page.evaluate(()=>window.dashboardNewProductsSnapshot());
 for(const p of data.rows){
  assert(Number.isInteger(p.current.sales)&&p.current.sales>=p.current.returned);
  assert.equal(p.current.gsvCents,p.current.gmvCents-p.current.refundCents);
  const sum=key=>p.platformFacts.reduce((n,f)=>n+f[key],0);
  for(const key of ['gsvCents','sales','returned','profitCents','received'])assert.equal(p.current[key],sum(key),'公司汇总等于各渠道合计');
  if(sum('gsvCents'))assert(Math.abs(p.current.profitRate-sum('profitCents')/sum('gsvCents')*100)<1e-8,'利润率按公司总额计算');
 }
 const row=page.locator('#newtable tbody tr').first();
 assert.equal(await row.locator('.rp-list-value').count(),7);
 assert.equal(await row.locator('.rp-list-value em').count(),5);
 const values=await row.locator('.rp-value').allTextContents();
 assert.match(values[6],/^[\d,]+$/,'库存上行只展示数量，不带单位');
 const warehouseValueLabel=await row.locator('.rp-list-value em').last().innerText();
 assert.match(warehouseValueLabel,/^货值 /);
 await row.locator('[data-nsp-view]').click();
 await page.locator('.up-detail').waitFor({state:'visible'});
 assert.equal(await page.locator('#up-platform').inputValue(),'all','查看默认进入全平台详情');
 assert.match(await page.locator('#dialogbody').innerText(),new RegExp(data.visible[0].name));
 const detailValues=await page.locator('.up-operating-kpis .up-metric strong').allTextContents();
 assert.deepEqual([detailValues[0],detailValues[2],detailValues[5],detailValues[6],detailValues[7]],values.slice(0,5),'明细与全平台产品详情数值一致');
 const stockValues=await page.locator('.up-detail [data-stock-card=warehouse] .up-stock-card-value strong').allTextContents();
 assert.deepEqual(stockValues,[values[6],warehouseValueLabel.replace('货值 ','')],'库存和货值与产品详情一致');
 if(data.visible[0].state==='滞销')assert.equal(await page.locator('[data-stock-risk="stagnant"]').count(),1,'明细滞销与产品详情风险一致');
 if(data.visible[0].state==='缺货')assert.equal(await page.locator('[data-stock-risk="shortage"]').count(),1,'明细缺货与产品详情风险一致');
 const launchInfo=()=>page.locator('[data-up-identity]').evaluate(dl=>Object.fromEntries([...dl.children].map(item=>[item.querySelector('dt').textContent,item.querySelector('dd').textContent])));
 let info=await launchInfo();
 assert.equal(info['新品上市日期'],data.visible[0].actualLaunch.slice(2).replaceAll('-','/'));
 assert.equal(info['已上市天数'],data.visible[0].days+' 天');
 await page.locator('.up-detail-period [data-drawer-time-value]').selectOption('3',{force:true});
 info=await launchInfo();
 assert.equal(info['新品上市日期'],data.visible[0].actualLaunch.slice(2).replaceAll('-','/'),'切换统计日期不改变上市日期');
 assert.equal(info['已上市天数'],String(Math.max(0,Math.round((Date.parse('2026-09-30')-Date.parse(data.visible[0].actualLaunch))/86400000)+1))+' 天','上市天数随统计截止日更新');
 await page.locator('#close').click();
}
