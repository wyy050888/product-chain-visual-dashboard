import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function verifyFocusRules(){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/02-focus-model.js',import.meta.url),'utf8'),sandbox);
 const expected={id:'case',owner:'甲',department:'产品中心',role:'重点A验收',mode:'direction',topic:'A',start:'2026-10-08',meeting:{owner:'甲',date:'2026-10-07',decision:'甲负责重点A验收'},risk:{active:true}},range={start:'2026-10-08',end:'2026-10-10'};
 const record=(owner,date,topics)=>({id:owner+date,date,owner,topics,submitted:date+'T18:00',progress:topics.join('、')});
 const data={expectations:[expected],coverage:[{owner:'甲',start:'2026-10-07',end:'2026-10-10',complete:true}],logs:[record('甲','2026-10-08',['B']),record('乙','2026-10-08',['A']),record('丙','2026-10-09',['A'])]};
 const run=change=>{const d=structuredClone(data);change?.(d);return sandbox.gdAnalyzeFocus(d,range)};
 assert.equal(run().length,1);
 assert.equal(run(d=>d.expectations[0].approvedSpecialty=true).length,0,'批准专项不因同事方向不同而报警');
 assert.equal(run(d=>d.expectations[0].role='').length,0,'没有明确职责不按人数判定');
 assert.equal(run(d=>d.expectations[0].meeting.owner='乙').length,0,'不能把他人的会议分工归给本人');
 assert.equal(run(d=>d.coverage[0].complete=false).length,0,'抓取不完整不判断未响应');
 assert.equal(run(d=>d.logs=d.logs.filter(l=>l.owner!=='甲')).length,0,'本人没有材料不等于未工作');
 assert.equal(run(d=>d.logs.push(record('甲','2026-10-09',['A']))).length,0,'材料已有重点动作不报警');
 assert.equal(run(d=>d.expectations[0].meeting.date='2026-10-11').length,0,'未来会议不能用作本期依据');
 assert.equal(run(d=>{d.expectations[0].mode='risk';d.expectations[0].risk.active=false}).length,0,'风险解除不产生风险响应异常');
 assert.equal(run(d=>{d.expectations[0].mode='risk';d.expectations[0].risk.range={end:'2026-10-01'}}).length,0,'过期风险快照不当作本期风险');
 assert.equal(run(d=>d.expectations[0].mode='interruption').length,0,'没有前期推进记录不判断推进中断');
 assert.equal(run(d=>{d.expectations[0].mode='interruption';d.logs.push(record('甲','2026-10-07',['A']))}).length,1);
 assert.equal(run(d=>{d.expectations[0].mode='interruption';d.logs.push(record('甲','2026-10-07',['A']),record('甲','2026-10-09',['A']))}).length,0,'后续已恢复推进不报警');
 assert.equal(sandbox.gdAnalyzeFocus(data,{start:'2026-10-01',end:'2026-10-06'}).length,0);
}
export async function globalDiagnosisFocus(page){
 verifyFocusRules();await page.emulateMedia({reducedMotion:'reduce'});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-tab="focus"]').click();let d=await audit();
 const types=['focus-direction','focus-risk-response','focus-interruption'];
 assert.equal(d.focus.length,3);assert.deepEqual(d.focus.map(r=>r.issueType),types);assert(!d.focus.some(r=>r.owner==='王磊'));
 assert.deepEqual(await root.locator('[data-gd-issue-type] option').evaluateAll(es=>es.slice(1).map(e=>e.textContent)),['工作方向疑似偏离','重大风险响应不足','重点工作推进中断']);
 assert(d.focus.every(r=>r.status==='待核实'&&r.focusEvidence.logs.every(l=>l.submitted&&!l.missing)));
 assert.equal(d.counts[0].stats[1][1],3);const counts=d.counts;
 for(const type of types){await root.locator('[data-gd-issue-type]').selectOption(type);d=await audit();assert.equal(d.visible.length,1);assert.equal(d.visible[0].issueType,type);assert.deepEqual(d.counts,counts)}
 await root.locator('[data-gd-reset]').click();await root.locator('[data-gd-search]').fill('常规来料抽检');d=await audit();assert.equal(d.visible.length,1);assert.equal(d.visible[0].id,'focus-risk-product');await root.locator('[data-gd-reset]').click();
 d=await audit();
 for(const row of d.focus){
  await root.locator('[data-gd-action="evidence"][data-gd-id="'+row.id+'"]').click();
  assert.equal(await page.locator('#dialogtitle').innerText(),'诊断依据');const text=await page.locator('#dialogbody').innerText();
  for(const title of ['当前应关注什么','抓取材料显示在做什么','发现的偏差','会议原文','日志来源'])assert(text.includes(title));
  for(const log of row.focusEvidence.logs){assert(text.includes(log.progress));assert(text.includes(log.logId))}
  assert(text.includes('第'+row.focusEvidence.meeting.row+'行'));assert.match(text,/需核实/);assert.doesNotMatch(text,/undefined|NaN|已认定失职/);
  assert.equal(await page.locator('#dialogbody input,#dialogbody textarea,#dialogbody select').count(),0);
  if(row.issueType==='focus-risk-response'){assert(text.includes(row.impact));await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/global-focus-risk-evidence.png',import.meta.url))})}
  await page.locator('#close').click();
 }
 await root.screenshot({path:fileURLToPath(new URL('../../outputs/global-focus-list.png',import.meta.url)),style:'.head,.navigation-toolbar{visibility:hidden!important}'});
 for(const width of [1920,1440,1024,390]){await page.setViewportSize({width,height:1080});const aligned=await root.locator('.gd-row-actions').evaluateAll(es=>es.every(e=>{const mid=[...e.children].map(b=>{const r=b.getBoundingClientRect();return r.y+r.height/2});return mid.every(v=>Math.abs(v-mid[0])<1)&&e.scrollWidth<=e.clientWidth+1}));assert(aligned);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))}
 await page.setViewportSize({width:1920,height:1080});
}
