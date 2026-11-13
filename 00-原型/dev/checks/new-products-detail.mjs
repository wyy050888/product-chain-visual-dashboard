import assert from 'node:assert/strict';

export async function openNewProductSpu(trigger){
 const panel=await trigger.getAttribute('popovertarget');
 await trigger.click();
 if(panel)await trigger.page().locator('.nsp-spu-picker:popover-open [data-nsp-open-spu]').first().click();
}

export async function newProductDetail(page){
 await page.locator('a[href="#new"]').click();
 await page.locator('#time-new [data-time-mode="quarter"]').click();
 await page.locator('#time-new [data-time-value]').selectOption('4',{force:true});
 await verifyNewProductDetail(page);
}
export async function verifyNewProductSeries(page){
 const snapshot=()=>page.evaluate(()=>dashboardNewProductsSnapshot());
 const initial=await snapshot(),series=initial.visible.find(row=>row.members.length>=3);
 assert(series,'至少一个简称关联三个 SPU');
 assert.equal(series.current.gsvCents,series.platformFacts.reduce((sum,value)=>sum+value.gsvCents,0),'简称 GSV 合并全平台业绩');
 const input=page.locator('[data-nsp-search]');
 await input.fill(series.members[1].spuCode);
 const row=page.locator('#newtable tbody tr');
 assert.deepEqual(await row.locator('.nsp-spu-names li').allTextContents(),series.members.map(member=>member.name));
 assert.equal(await row.locator('td').nth(1).innerText(),series.shortName);
 assert.equal(await row.locator('td').first().evaluate(cell=>getComputedStyle(cell).position),'sticky');
 const alignment=await row.locator('[data-nsp-view]').evaluate(button=>{
  const label=button.querySelector('span').getBoundingClientRect(),icon=button.querySelector('svg').getBoundingClientRect();
  return Math.abs(label.top+label.height/2-icon.top-icon.height/2);
 });
 assert(alignment<1,'查看与下拉箭头垂直居中');
 await row.locator('[data-nsp-view]').click();
 assert.equal(await page.locator('#overlay').isHidden(),true,'点击查看先打开菜单');
 await row.locator('[data-nsp-open-spu]').nth(1).click();
 await page.locator('.up-detail').waitFor();
 assert((await page.locator('#dialogbody').innerText()).includes(series.members[1].name),'选择第二个 SPU 打开对应详情');
 await page.locator('#close').click();
 await input.fill('');
 await page.locator('#newtop [data-nsp-assessment-entry]').click();
 const assessment=page.locator('[data-nsp-assessment-table]');
 assert.deepEqual((await assessment.locator('th').allTextContents()).slice(0,2),['SPU系列','产品简称']);
 assert.equal((await assessment.locator('th').allTextContents()).at(-2),'项目类型');
 assert.equal((await page.evaluate(()=>dashboardNewProductAssessmentSnapshot())).rows.filter(row=>row.seriesId===series.seriesId).length,1);
 await page.locator('[data-nsp-assess-search]').fill(series.members[1].name);
 const assessmentRow=assessment.locator('tbody tr').filter({hasText:series.members[1].name});
 await assessmentRow.locator('[data-nsp-assess-product]').click();
 await page.keyboard.press('Escape');
 assert(await page.locator('.nsp-assessment').isVisible(),'Escape 先关闭 SPU 菜单');
 assert.equal(await page.locator('.nsp-spu-picker:popover-open').count(),0);
 await page.locator('[data-nsp-assess-search]').fill('');
 const singleAssessment=assessment.locator('[data-nsp-assess-product]:not([popovertarget])').first();
 assert.equal(await singleAssessment.locator('svg').count(),0);
 await singleAssessment.click();
 await page.locator('.up-detail').waitFor();
 await page.locator('#close').click();
 await page.locator('#close').click();
 const single=page.locator('#newtable [data-nsp-view]:not([popovertarget])').first();
 assert.equal(await single.locator('svg').count(),0);
 await single.click();
 await page.locator('.up-detail').waitFor();
 assert.equal(await page.locator('.nsp-spu-picker:popover-open').count(),0);
 await page.locator('#close').click();
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
 await openNewProductSpu(row.locator('[data-nsp-view]'));
 await page.locator('.up-detail').waitFor({state:'visible'});
 assert.equal(await page.locator('#up-platform').inputValue(),'all','查看默认进入全平台详情');
 assert.match(await page.locator('#dialogbody').innerText(),new RegExp(data.visible[0].name));
 const detailValues=await page.locator('.up-operating-kpis .up-metric strong').allTextContents();
 if(data.visible[0].members.length===1)assert.deepEqual([detailValues[0],detailValues[2],detailValues[5],detailValues[6],detailValues[7]],values.slice(0,5),'单 SPU 明细与全平台详情数值一致');
 const ownStock=await page.locator('#up-stock-skus [data-stock-metric="warehouse"]').evaluateAll(cells=>cells.reduce((total,cell)=>total+Number(cell.dataset.stockRaw),0));
 if(data.visible[0].members.length===1)assert.equal(ownStock,data.visible[0].sellableStock.warehouse,'新品库存和详情SKU明细汇总一致');
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
