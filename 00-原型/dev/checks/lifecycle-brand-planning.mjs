import assert from 'node:assert/strict';
import {setProductCenterRole} from './product-center-role-fixture.mjs';

export async function lifecycleBrandPlanning(page){
 const url=new URL('产品中心.html',page.url()).href;
 await page.clock.setFixedTime(new Date('2026-11-17T04:00:00Z'));
 await page.goto(url);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const table=page.locator('#lifetable'),toggle=table.getByRole('button',{name:/展开品牌|收起品牌/});
 const brands=table.locator('[data-pc-life-brand-row]'),card=stage=>page.locator('#lifecards [data-life="'+stage+'"]');
 const brand=table.locator('[data-pc-life-brand-row][data-chain="2"][data-brand="创维"]');
 const chain=table.locator('[data-pc-life-chain="2"]'),icon=button=>button.locator('.ui-dropdown-icon').evaluate(el=>getComputedStyle(el).maskImage);
 const rotation=button=>button.locator('.ui-dropdown-icon').evaluate(el=>getComputedStyle(el).transform);
 const right='matrix(0, -1, 1, 0, 0, 0)';
 const parentInput=page.locator('[data-lt-number="0:3"][data-lt-brand-name=""]');
 const input=page.locator('[data-lt-number="0:3"][data-lt-brand-name="创维"]'),planToggle=page.locator('[data-lt-plan-toggle="0"]');
 const lines=page.locator('[data-lt-brand-row]'),bulk=page.locator('[data-lt-plan-bulk]');
 const year=()=>page.evaluate(()=>lifecycleTargetsAudit().saved.years[2026]);
 const open=()=>page.locator('#lt-open-targets').click();
 assert.equal(await page.locator('#pc-brand-plan').count(),0);
 assert.equal(await brands.count(),0);
 assert.equal(await toggle.locator('..').textContent(),'链群展开品牌');
 const aligned=()=>toggle.evaluate(button=>{
  const cell=button.closest('th'),padding=parseFloat(getComputedStyle(cell).paddingRight);
  return Math.abs(cell.getBoundingClientRect().right-padding-button.getBoundingClientRect().right)<=2;
 });
 assert(await aligned(),'展开入口贴合表头单元格右侧');
 assert.equal(await table.locator('[data-pc-life-chain]>.ui-dropdown-icon').count(),4);
 const down=await icon(chain);
 assert.notEqual(down,'none');
 assert.equal(await icon(toggle),down);
 assert.equal(await rotation(chain),right);
 await chain.press('Enter');
 assert.equal(await chain.getAttribute('aria-expanded'),'true');
 assert(await chain.evaluate(button=>button===document.activeElement));
 const up=await icon(chain);
 assert.notEqual(up,down);
 assert.equal(await rotation(chain),'none');
 assert.deepEqual(await brands.evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['2']);
 assert.equal(await toggle.innerText(),'展开品牌');
 await toggle.click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 assert.equal(await icon(toggle),up);
 assert.deepEqual(await brands.evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['0','1','2','3']);
 const logos=table.locator('[data-pc-life-brand-row] .pc-life-brand-name img');
 assert((await logos.count())>0);
 assert(await logos.evaluateAll(async images=>(await Promise.all(images.map(img=>img.decode().then(()=>img.naturalWidth>0,()=>false)))).every(Boolean)));
 assert.equal(await table.locator('[data-brand="MR.EGO"] .pc-life-brand-initial').textContent(),'M');
 await chain.click();
 assert.equal(await icon(chain),down);
 assert.equal(await rotation(chain),right);
 assert.deepEqual(await brands.evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['0','1','3']);
 await toggle.click();
 for(const stage of [0,1,2,3,4,5,7]){
  await card(stage).click();
  const reconciled=await table.locator('tbody tr').evaluateAll(rows=>{
   let parent=null;
   const groups=[];
   const number=cell=>Number(cell.querySelector('button')?.firstChild.textContent.replaceAll(',','')??cell.textContent.replaceAll(',',''));
   for(const row of rows){
    if(row.hasAttribute('data-life-summary'))continue;
    if(!row.hasAttribute('data-pc-life-brand-row')){
     parent={actual:number(row.cells[2]),annual:number(row.cells[5]),brandActual:0,brandAnnual:0};groups.push(parent);
    }else{
     parent.brandActual+=number(row.cells[2]);parent.brandAnnual+=number(row.cells[5]);
    }
   }
   return groups.length===4&&groups.every(group=>group.actual===group.brandActual&&group.annual===group.brandAnnual);
  });
  assert(reconciled,'品牌完成数与链群完成数一致，规划 '+stage);
 }
 await page.locator('#lt-chain-tabs [data-lt-chain="2"]').click();
 assert.deepEqual(await brands.evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['2']);
 await card(6).click();
 assert.equal(await toggle.count(),0);
 assert.equal(await table.locator('tbody tr').count(),1);
 await table.getByRole('button').first().click();
 assert.doesNotMatch(await page.locator('#toast').innerText(),/链群 = /);
 await card(0).click();
 await page.locator('#lt-chain-tabs [data-lt-chain="all"]').click();
 assert.equal(await brand.locator('td').nth(1).innerText(),'3','品牌月目标沿用季度拆月');
 await brand.getByRole('button').first().click();
 assert.match(await page.locator('#toast').innerText(),/链群 = 环境[\s\S]*品牌 = 创维/);
 await toggle.click();
 assert.equal(await brands.count(),0);
 await open();
 assert.equal(await lines.count(),0);
 assert.equal(await page.locator('#lt-brand,[data-lt-plan-toggle="7"]').count(),0);
 const parent=await parentInput.inputValue();
 assert.equal(await rotation(planToggle),right);
 await planToggle.press('Enter');
 assert.equal(await planToggle.getAttribute('aria-expanded'),'true');
 assert.equal(await icon(planToggle),up);
 assert.equal(await rotation(planToggle),'none');
 assert(await planToggle.evaluate(button=>button===document.activeElement));
 assert.deepEqual(await lines.locator('th').allTextContents(),['创维','美的','苏泊尔','康佳','海尔']);
 assert.equal(await input.inputValue(),'9');
 assert.equal(await page.locator('#lt-table').getByRole('rowheader',{name:'研发创新规划'}).count(),1);
 await input.fill('42');
 assert.equal((await year()).brandValues[0]['创维'][0][3],42);
 assert.equal((await year()).values[0][0][3],Number(parent));
 assert.equal(await input.locator('../..').locator('[data-lt-row-total]').innerText(),'68');
 assert.equal(await parentInput.locator('../..').locator('[data-lt-row-total]').innerText(),'72');
 await bulk.click();
 assert.equal(await lines.count(),40);
 await bulk.click();
 assert.equal(await lines.count(),0);
 await page.reload();
 await planToggle.click();
 assert.equal(await input.inputValue(),'42');
 await page.locator('[data-lt-import]').click();
 const download=page.waitForEvent('download');
 await page.locator('[data-lt-template]').click();
 assert.equal((await download).suggestedFilename(),'生命周期目标导入模板.xlsx');
 const csv='年度,链群,计划,Q1,Q2,Q3,Q4,品牌\n2026,环境,自研上品计划,,,,39,创维\n2026,环境,自研上品计划,,,,12,新增品牌';
 await page.locator('#lt-import-file').setInputFiles({name:'品牌目标.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.locator('#lt-import-confirm').click();
 await page.locator('#lt-import-dialog').waitFor({state:'hidden'});
 assert.equal(await input.inputValue(),'39');
 assert.equal(await parentInput.inputValue(),parent);
 await page.goto(url);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await toggle.click();
 assert.equal(await brand.locator('td').nth(1).innerText(),'13');
 const added=table.locator('[data-pc-life-brand-row][data-chain="2"][data-brand="新增品牌"]');
 assert.equal(await added.locator('td').nth(1).innerText(),'4','新增品牌在看板的对应链群显示目标');
 await setProductCenterRole(page,'owner');
 assert.deepEqual(await brands.evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['2']);
}
