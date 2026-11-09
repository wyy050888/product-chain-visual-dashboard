import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function diagnosisDailyReview(page){
 const box=vm.createContext({esc:value=>String(value??''),gdProblemText:r=>r.problem||'',gdHistoryIdentity:r=>r.id,document:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/03-followup.js',import.meta.url),'utf8'),box);
 for(const value of [undefined,'待跟进','待核实','重新出现'])assert.equal(box.gdFollowStatus({lifecycle:{status:value}}),'','没有明确进度时留空');
 for(const value of ['未开始','跟进中','已暂停','已完成'])assert.equal(box.gdFollowStatus({lifecycle:{status:value}}),value);
 assert.equal(box.gdFollowStatus({lifecycle:{status:'待验证'}}),'跟进中');
 assert.equal(box.gdFollowStatus({lifecycle:{status:'待核实',verificationPending:true,previous:'已暂停'}}),'已暂停');
 assert(box.gdFollowStatusMarkup({}).includes('>—</span>'));assert(box.gdFollowStatusMarkup({}).includes('缺少本事项的明确跟进证据'));
 assert.equal(box.gdFollowMatches({},'active'),true);assert.equal(box.gdFollowMatches({},'all'),true);
 for(const status of ['未开始','跟进中','已暂停','已完成'])assert.equal(box.gdFollowMatches({},status),false,'空状态不混入任一确定状态');
 const row={id:'only-engineering-case',problem:'同一问题',participants:[],sources:[]};
 const revision=(date,problem=row.problem)=>({knownAt:date,payload:{work:[{...row,problem}],deviations:[],findingStates:{[row.id]:{status:'待跟进',reason:'仍需跟进'}}}});
 let found=box.gdFollowIndex([revision('2026-11-05'),revision('2026-11-06')]).get(row.id);
 assert.equal(found.firstAt,'2026-11-05');assert.equal(found.updatedAt,'2026-11-05');assert.equal(found.checkedAt,'2026-11-06');assert.equal(found.records.length,1,'无实质进展不复制记录');
 const recheck=revision('2026-11-06');recheck.payload.findingStates[row.id].reason='仅核对说法改变，没有新事实';const same=box.gdFollowIndex([revision('2026-11-05'),recheck]).get(row.id);assert.equal(same.updatedAt,'2026-11-05','核对说明变化不伪造内容更新');assert.equal(box.gdFollowMatches({exit_reason:'工程撤回',lifecycle:{status:'跟进中'}},'active'),false);
 found=box.gdFollowIndex([revision('2026-11-05'),revision('2026-11-06','新增执行结果')]).get(row.id);assert.equal(found.updatedAt,'2026-11-06');assert.equal(found.firstAt,'2026-11-05');
 await page.clock.setFixedTime(new Date('2026-11-06T02:30:00Z'));await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href="#ai"]').click();
 const tasks=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().tasks.map(r=>r.task)));
 for(const [part,tab] of [['coordination','project'],['coordination','high-risk'],['resource','omission']]){
  await page.locator('[data-gd-part="'+part+'"]').click();await page.locator('[data-gd-tab="'+tab+'"]').click();
  const root=page.locator('#ai'),headers=await root.locator('.gd-analysis-table th').allTextContents();assert.equal(headers[0],'诊断日期');assert.equal(headers[1],'业务对象');assert.equal(headers.indexOf('更新日期'),headers.indexOf('跟进状态')+1);assert(!headers.includes('上榜日期'));
  const status=root.locator('[data-gd-follow-status]');assert.equal(await status.count(),1);assert(await status.evaluate(el=>!!el.closest('.unified-input-group')),'复用统一筛选组件');
  assert.deepEqual(await status.locator('option').allTextContents(),['未完成','全部记录','未开始','跟进中','已暂停','已完成']);
  assert.equal(await root.locator('[data-ai-include-handled]').count(),0);
  const unknown=root.locator('[data-follow-state=""]');assert(await unknown.count()>0,'未确认进度的样例不默认未开始');
  assert((await unknown.first().locator('..').innerText()).includes('缺少本事项的明确跟进证据'));
  const row=root.locator('.gd-analysis-table tbody tr').first();assert.equal(await row.locator('[data-label="业务对象"] .gd-analysis-muted').count(),0);
  if(tab==='project'){const object=await row.locator('[data-label="业务对象"]').innerText();assert(object.includes('项目：')&&object.includes('任务：'));assert(!object.includes('任务：—'),'项目卡点保留具体任务名');assert((await row.locator('[data-label="建议负责人"] .gd-person').count())<=1,'外侧仅显示一个已明确的建议主责');}
  await row.locator('[data-gd-action="analysis"]').click();assert(await page.locator('table[aria-label="问题跟进记录"]').count());assert((await page.locator('[data-ai-finding-history]').innerText()).includes('最近核对'));await page.locator('#close').click();
  await status.evaluate(el=>{el.value='已完成';el.dispatchEvent(new Event('change',{bubbles:true}))});assert(await root.locator('[data-follow-state]').evaluateAll(rows=>rows.every(r=>r.dataset.followState==='已完成')));
  await status.evaluate(el=>{el.value='未开始';el.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(await root.locator('[data-follow-state=""]').count(),0,'未开始筛选排除空状态');
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().tasks.map(r=>r.task))),tasks,'查看和筛选诊断不回写手工任务');
 // 在独立VM模拟来源失败，不为检查向业务页面暴露可改写内部函数。
 const saved={knownAt:'2026-11-05',date:'2026-11-05',payload:{work:[{id:'failure-case',kind:'key-work',date:'2026-11-05',problem:'已有进展'}],reports:[],deviations:[],findingStates:{'failure-case':{status:'跟进中',reason:'已经推进'}}}};
 Object.assign(box,{gdRange:()=>({start:'2026-11-01',end:'2026-11-06'}),gdState:{period:{}},aiCoverageStart:'2026-01-01',DATA_CUTOFF:'2026-11-06',drawerPeriodFromRange:v=>v,gdBuildDiagnosis:()=>{throw new Error('工程检查：来源断网')},aiHistoryFail:()=>saved,aiHistoryStream:()=>({revisions:[saved]}),aiHistoryStatus:()=>({failure:true}),upTodos:{},gdLedgerRow:v=>v,gdTaskDatesMatch:()=>true,shiftDate:v=>v});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/02-global.js',import.meta.url),'utf8'),box);
 const retained=box.gdHistoryDataset().work[0];assert.equal(box.gdFollowStatus(retained),'跟进中');assert.equal(retained.lifecycle.verificationPending,true,'取数失败保留原进度并标受限');
 box.gdHasExecution=()=>false;
 const cancelled=box.gdHistoryObserve({id:'cancelled',kind:'key-work',keyType:'project',projectId:'P'},{work:[],deviations:[],reports:[],sources:[{id:'projects',rows:[{id:'P',projectState:'已取消',stageData:[],status:'红灯'}]}]});
 assert.equal(cancelled.kind,'not_hit','取消项目退出卡点，不假称业务完成');assert.equal(box.gdFollowStatus({lifecycle:{status:'不再命中',lastActiveStatus:'跟进中'}}),'跟进中');
}
