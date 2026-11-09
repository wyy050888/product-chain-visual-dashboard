import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {assertPreviewButtonClear} from './preview-geometry.mjs';

function verifyText(){
 const box=vm.createContext({esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/04-readable-text.js',import.meta.url),'utf8'),box);
 const input='秦鼎：1）封样待推进，完成-9/23 2）首批上市预计9/24 3）蒸汽量偏小；任务延期45天。尚未关联执行单。';
 const output=box.gdReadableText(input);
 for(const marker of ['1）','2）','3）'])assert(output.includes('\n'+marker),'编号独立成行');
 assert(output.includes('；任务延期45天。尚未关联执行单。'),'短状态句不按标点拆行');
 assert.equal(box.gdReadableText('任务已延期22天；尚未登记对应风险台账，也未落实执行单。'),'任务已延期22天；尚未登记对应风险台账，也未落实执行单。');
 assert.equal(box.gdReadableText(output),output,'重复格式化不增加空行');
 for(const value of ['2026/10/26 23:59:59','9/23—9/24','利润率-13.3% / 12.7%','CW-LJ-Q516-SKU01','V1.2.3','3500.00元'])assert.equal(box.gdReadableText(value),value,'日期、金额、小数和编码不拆分');
 assert.equal(box.gdReadableText('原段一\r\n原段二'),'原段一\n原段二');
 assert.equal(box.gdReadableMarkup('<script>'), '&lt;script&gt;','原文继续转义');
 const metrics='库存1,933件，货值118.5w；可售4.9天，环比+0.19%，已延期 22 天。';
 const markup=box.gdReadableMarkup(metrics);
 assert.equal(markup.replace(/<\/?span[^>]*>/g,''),metrics,'数字保护不改原文或标点');
 for(const value of ['1,933件','118.5w','4.9天','+0.19%','22 天'])assert(markup.includes('class="gd-inline-value">'+value+'</span>'),'数值与单位整体显示 '+value);
}
export async function diagnosisReadableText(page){
 verifyText();await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai');await page.locator('a[href="#ai"]').click();
 const snapshot=()=>page.evaluate(()=>{const d=globalDiagnosisAudit();return JSON.stringify({work:d.work.map(r=>[r.workKey,r.sources]),reports:d.reports.map(r=>[r.id,r.content]),tasks:d.tasks.map(r=>r.task.id)})});
 const before=await snapshot();
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await root.locator('.gd-card-stats>span').evaluateAll(nodes=>nodes.every(node=>{
   const item=node.getBoundingClientRect(),card=node.closest('.gd-card').getBoundingClientRect();
   return getComputedStyle(node).whiteSpace==='nowrap'&&item.left>=card.left&&item.right<=card.right+1;
  })),'卡片分类与数量整体换行、不溢出 '+width);
  for(const [part,tabs] of [['coordination',['project','high-risk']],['resource',['omission','blocker','solution','focus-shift']],['execution',['quality','missing']]]){
   await root.locator('[data-gd-part="'+part+'"]').click();
   for(const tab of tabs){
    if(tab)await root.locator('[data-gd-tab="'+tab+'"]').click();
    if(part==='coordination'&&tab==='high-risk'){
     const risks=await page.evaluate(()=>globalDiagnosisRiskSnapshot());
     assert(risks.rows.length>0,'覆盖当前有效且通过15天去重的风险');
     assert(risks.rows.every(r=>!r.problem.includes('升级')),'文案不再描述等级升级');
     for(const row of risks.rows){
      const cell=root.locator('[data-gd-key-work="'+row.workKey+'"] [data-label="问题描述"]');
      const lines=(await cell.locator('.gd-problem').textContent()).split('\n');
      assert(lines.length>=2&&lines[1].startsWith('当前预警：'),'风险变化及原生指标分组；执行台账状态不作为新增高危入选前提');
      const history=risks.history.find(h=>h.id===row.riskAlertId),source=risks.sources.find(s=>s.key===history.kind+'|'+history.objectId+'|'+history.platform);
      assert(source.metrics.every(metric=>lines.some(line=>line.includes(metric.name+'：'+metric.value))),'同一指标保持完整、沿用预警原值 '+JSON.stringify({lines,metrics:source.metrics}));
     }
    }
    const blocks=root.locator('.gd-analysis-table .gd-problem,.gd-analysis-table .gd-readable-text');
    assert(await blocks.evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).whiteSpace==='pre-line')),'三模块长文允许换行 '+part+'/'+tab+'/'+width);
    const cells=await root.locator('.gd-analysis-table .gd-task-cell').all();let expanded=0;
    for(const cell of cells){
     const button=cell.locator('[data-gd-cell-more]');if(!(await button.isVisible()))continue;
     await button.click();const preview=cell.locator('.gd-task-preview');await assertPreviewButtonClear(preview);
     assert(await preview.evaluate(node=>node.scrollHeight<=node.clientHeight+1),'展开后完整显示分项');
     await button.click();if(++expanded>=2)break;
    }
    assert(await root.locator('.gd-inline-value').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).whiteSpace==='nowrap')),'主表数值单位不拆开 '+part+'/'+tab+'/'+width);
    const action=root.locator('.gd-analysis-table [data-gd-action="analysis"]').first();
    if(await action.count()){
     await action.click();const drawer=page.locator('.gd-analysis-dialog');
     assert(await drawer.isVisible());
     if(await drawer.locator('[data-gd-report-pane="sources"]').count())await page.locator('#drawer-tabs [data-drawer-tab="sources"]').click();
     assert(await drawer.locator('.gd-text-section p,.gd-analysis-sources table[aria-label="来源与内容"] td:nth-child(2)').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).whiteSpace==='pre-line')),'详情正文与原文保持换行 '+part+'/'+tab+'/'+width);
     assert(await drawer.locator('.gd-inline-value').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).whiteSpace==='nowrap')),'依据内同样保护数字单位');
     await page.locator('#close').click();
    }
   }
  }
 }
 assert.equal(await snapshot(),before,'查看、分段及展开不改变原文、诊断身份和任务');
 await page.setViewportSize({width:1920,height:1080});await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="project"]').click();
 const problem=root.locator('.key-work [data-label="问题描述"] .gd-problem').first();
 assert((await problem.innerText()).includes('\n'),'项目卡点的独立事实分行');
 const more=problem.locator('..').locator('..').locator('[data-gd-cell-more]');if(await more.isVisible())await more.click();
 await root.locator('.key-work').screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-readable-projects.png',import.meta.url))});
 await root.locator('[data-gd-tab="high-risk"]').click();
 for(const button of await root.locator('[data-label="问题描述"] [data-gd-cell-more]').all())if(await button.isVisible())await button.click();
 await root.locator('.key-work').screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-readable-risk-metrics.png',import.meta.url))});
 console.log('通过：三模块八类视图及依据分行、风险指标与数值完整、卡片整项换行、原文不变与展开无重叠');
}
