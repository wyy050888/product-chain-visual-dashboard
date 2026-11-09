import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function verifySourcePresentation(){
 const box=vm.createContext({Intl,esc:escape,gdReadableMarkup:value=>escape(value).replaceAll('\n','<br>')});
 for(const file of ['shared-classification/02-diagnosis-catalog.js','global-diagnosis/05-source-location.js','global-diagnosis/05-analysis-details.js']){
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),box);
 }
 const project={id:'project',sourceTypeKey:'project-progress',sourceName:'产品A · 验证任务',date:'2026-10-11',capturedDate:'2026-11-07',content:'原任务进展。'};
 const before=JSON.stringify(project),view=box.gdSourceLocation(project);
 assert.equal(view.type,'运营罗盘-项目管理');assert.equal(view.name,project.sourceName);assert.equal(view.capturedDate,'26/11/07');
 assert.equal(JSON.stringify(project),before,'展示不改写来源及业务事实');
 assert.match(box.gdSourceContentMarkup(project),/业务日期：26\/10\/11/);
 const daily={id:'daily',sourceTypeKey:'ding-daily',owner:'人员A',department:'品质中心',sourceName:'人员A的日报261104',date:'2026-11-04',capturedDate:'2026-11-05',submittedAt:'2026-11-04T18:00:00+08:00',content:'原工作记录'};
 assert.equal(box.gdSourceLocation(daily).type,'日报');assert.equal(box.gdSourceLocation(daily).name,'人员A · 品质中心');
 assert.match(box.gdSourceContentMarkup(daily),/工作日期：26\/11\/04/);assert.match(box.gdSourceLocationMarkup(daily),/抓取日期：26\/11\/05/);
 const missing={sourceTypeKey:'ding-daily',content:'原文',date:'2026-11-04'};
 assert.doesNotMatch(box.gdSourceLocationMarkup(missing),/未记录|抓取日期|2026|26\/11\/04/,'业务日期不补作抓取日期，缺失元数据留空');
 const weekly={sourceTypeKey:'ding-weekly',sourceName:'第43周原报告.docx',businessPeriod:{start:'2026-10-19',end:'2026-10-25'},capturedDate:'2026-11-07',content:'原报告片段'};
 assert.equal(box.gdSourceLocation(weekly).type,'周报');assert.equal(box.gdSourceLocation(weekly).name,'第43周原报告.docx');
 assert.match(box.gdSourceContentMarkup(weekly),/26\/10\/19—26\/10\/25/);
 const combined={id:'combined',sourceTypeKey:'project-progress',capturedDate:'2026-11-07',content:'原联合对照',references:[{id:'a',sourceTypeKey:'ding-daily',owner:'人员A',capturedDate:'2026-11-05'},{id:'b',sourceTypeKey:'ding-weekly',sourceName:'原周报.docx',content:'周报准确原文'}]};
 const split=box.gdSourceRows([combined]);assert.equal(split.length,2);assert.equal(split[1].capturedDate,undefined,'不同来源不继承父记录抓取时间');
 assert.match(split[0].content,/联合引用内容/);assert.equal(split[1].content,'周报准确原文');
 const markup=box.gdAnalysisSourceTable([combined,{id:'scope',sourceTypeKey:'ai-analysis',content:'实际已读范围'}]);
 assert.equal((markup.match(/data-analysis-source=/g)||[]).length,2);assert.match(markup,/data-source-reading-scope/);
 assert.doesNotMatch(markup,/>AI分析</);assert.match(markup,/原联合对照/);assert.match(markup,/周报准确原文/);
 assert.equal(box.gdSourceLocation({systemName:'数智罗盘',moduleName:'店铺经营',objectName:'店铺A'}).type,'数智罗盘-店铺经营');
 assert.equal(box.gdSourceLocation({sourceLabel:'钉钉-组织人员'}).type,'钉钉-组织人员');
 assert.equal(box.gdSourceLocation({reportType:'经营汇报',sourceName:'Q3原汇报.docx'}).type,'经营汇报（补充材料）');
}

export async function diagnosisSourcePresentation(page){
 verifySourcePresentation();
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const before=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports));
 for(const type of ['日报','周报','月报']){
  await root.locator('[data-gd-report-type="'+type+'"]').click();
  await root.locator('[data-report-row]').first().locator('td:last-child button').click();
  await page.locator('#drawer-tabs [data-drawer-tab="sources"]').click();
  const table=page.locator('#dialogbody [data-gd-report-pane="sources"] .gd-analysis-sources > table[aria-label="来源与内容"]').first();
  assert.deepEqual(await table.locator(':scope > thead > tr > th').allTextContents(),['来源','内容']);
  const labels=await table.locator('[data-source-type]').allTextContents();
  assert(labels.length>0);assert(labels.every(label=>label===type));
  assert((await table.locator('[data-source-name]').allTextContents()).every(Boolean));
  assert((await table.locator('[data-source-captured]').allTextContents()).every(value=>/^抓取日期：\d{2}\/\d{2}\/\d{2}$/.test(value)));
  assert.doesNotMatch(await table.innerText(),/未记录来源名称|未记录提交人/);
  await page.locator('#close').click();
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports)),before,'来源展示不改写报告或原证据');
 console.log('通过：来源标签、名称、抓取日期三层，报告元数据与业务日期分离，多来源独立、缺失字段留空，原证据不改写');
}

export async function diagnosisEmptyFollowState(page){
 const box=vm.createContext({esc:escape,document:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/03-followup.js',import.meta.url),'utf8'),box);
 const source={lifecycle:{status:'',verificationPending:true,reason:'保留原缺证说明'}};const before=JSON.stringify(source);
 assert.equal(box.gdFollowStatus(source),'');assert.equal(box.gdFollowMatches(source,'active'),true);
 assert.equal(box.gdFollowStatusMarkup(source),'<span class="muted" data-follow-state="">暂无</span>');
 assert.equal(JSON.stringify(source),before,'暂无仅用于展示，不回写业务状态');
 for(const status of ['未开始','跟进中','已暂停','已完成'])assert.match(box.gdFollowStatusMarkup({lifecycle:{status}}),new RegExp('>'+status+'<'));
 const root=page.locator('#ai');await root.locator('[data-gd-part]').first().click();
 const empty=root.locator('[data-follow-state=""]').first();await empty.waitFor();
 assert.equal(await empty.innerText(),'暂无');assert(await empty.evaluate(e=>e.classList.contains('muted')));
 assert.equal(await empty.evaluate(e=>e.closest('td[data-label="跟进状态"]').innerText.trim()),'暂无','状态单元格只展示暂无');
 const values=await root.locator('[data-gd-follow-status] option').evaluateAll(options=>options.map(option=>option.value));
 assert.deepEqual(values.slice(2),['未开始','跟进中','已暂停','已完成']);assert(!values.includes('暂无'));
 console.log('通过：空跟进状态显示灰色暂无，空值及未完成筛选语义保留，四个业务状态不变');
}
