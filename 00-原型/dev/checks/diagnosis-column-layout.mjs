import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

export async function diagnosisColumnLayout(page){
 await page.clock.setFixedTime(new Date('2026-11-07T10:30:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#ai"]').click();
 const root=page.locator('#ai'),table=()=>root.locator('.gd-analysis-table>table');
 const snapshot=()=>table().locator('thead th').evaluateAll(cells=>Object.fromEntries(cells.map(cell=>[cell.textContent.trim(),cell.getBoundingClientRect().width])));
 const open=async(part,tab)=>{await root.locator('[data-gd-part="'+part+'"]').click();await root.locator('[data-gd-tab="'+tab+'"]').click()};
 const business=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().tasks.map(row=>row.task)));
 const cases=[['coordination','project'],['coordination','high-risk'],...['omission','blocker','solution','focus-shift'].map(tab=>['resource',tab])];
 for(const width of [1920,1440]){
  await page.setViewportSize({width,height:1080});
  for(const [part,tab] of cases){
   await open(part,tab);const fields=await snapshot();
   assert(fields['问题描述']>=299&&fields['行动建议']>=339,'长文本保留足够宽度：'+tab);
   if(part==='coordination'){
    const highRisk=tab==='high-risk';
    assert(fields['问题描述']>=(highRisk?419:379)&&fields['行动建议']>=(highRisk?459:419),'重点工作四处长文本进一步加宽：'+tab);
   }
   assert(fields['业务对象']>=259,'业务对象保留名称阅读宽度：'+tab);
   for(const label of ['诊断日期','更新日期'])assert(fields[label]>=95&&fields[label]<=121,'日期列宽度稳定：'+label);
   if(fields['项目红绿灯'])assert(fields['项目红绿灯']<=121,'灯色不占用长文本宽度');
   if(fields['优先级'])assert(fields['优先级']<=96,'优先级保留短列');
   for(const label of ['建议负责人','涉及人员','建议整改期限'])if(fields[label])assert(fields[label]<=161,'短字段不能过宽：'+label);
   assert(fields['问题描述']>fields['业务对象']&&fields['行动建议']>fields['业务对象']);
   const headers=Object.values(fields),cells=await table().locator('tbody tr').first().locator('td').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
   if(cells.length===headers.length)for(let i=0;i<cells.length;i++)assert(Math.abs(cells[i]-headers[i])<2,'表头与正文列对齐');
   if(width===1920&&process.env.DASHBOARD_DIAGNOSIS_COLUMN_SHOTS&&['project','high-risk','omission'].includes(tab))await root.locator('.gd-panel').screenshot({path:path.join(os.tmpdir(),'diagnosis-columns-'+tab+'.png')});
  }
 }
 // 旧表头对应的错误宽度不能污染新配置，也不能清掉其他表格偏好。
 await page.setViewportSize({width:1920,height:1080});await open('coordination','project');
 const labels=await table().locator('thead th').allTextContents();
 const legacy=JSON.stringify(['ai-inline-details','',0,labels.map((name,i)=>[i,1,name.trim()])]);
 await page.evaluate(({legacy,labels})=>localStorage.setItem('dashboard-column-widths-v1',JSON.stringify({[legacy]:labels.map(()=>80),'unrelated-table':[180,280]})),{legacy,labels});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href="#ai"]').click();
 let fields=await snapshot();assert(fields['问题描述']>=299&&fields['行动建议']>=339,'忽略旧结构的错误列宽');
 const problem=table().locator('thead th').filter({hasText:'问题描述'}),handle=problem.locator('[data-ui-column-handle]');
 await handle.waitFor();await handle.focus();await page.keyboard.press('ArrowRight');
 const adjusted=await snapshot();assert(Math.abs(adjusted['问题描述']-fields['问题描述']-8)<2);assert(Math.abs(adjusted['行动建议']-fields['行动建议'])<2,'调整单列不挤压相邻列');
 await open('coordination','high-risk');await open('coordination','project');fields=await snapshot();assert(Math.abs(fields['问题描述']-adjusted['问题描述'])<2,'保留新结构的列宽调整');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-column-widths-v1'))['unrelated-table']),[180,280]);
 await page.setViewportSize({width:390,height:844});assert(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'窄屏只在表格内部滚动');
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().tasks.map(row=>row.task))),business,'列宽调整不改业务任务');
}
