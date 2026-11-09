import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function aiResultHistory(page){
 const memory=new Map(),ctx=vm.createContext({window:{},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/01-store.js',import.meta.url),'utf8'),ctx);
 const first=ctx.aiHistoryPublish('x',{date:'2026-11-03',payload:{problem:'原问题'}});
 ctx.aiHistoryPublish('x',{date:'2026-11-04',payload:{problem:'新增进展'}});
 assert.equal(ctx.aiHistoryAsOf('x','2026-11-03').payload.problem,'原问题','后续版本不改原业务日');
 const n=ctx.aiHistoryStatus('x').versions;
 ctx.aiHistoryFail('x','模拟缺数');assert.equal(ctx.aiHistoryStatus('x').versions,n);assert.equal(ctx.aiHistoryAsOf('x','2026-11-04').payload.problem,'新增进展');
 assert.equal(ctx.aiHistoryCompute('x','2026-11-05',()=>{throw new Error('模拟断网')}).problem,'新增进展');
 assert.equal(ctx.aiFindingTransition({status:'跟进中'},null).status,'跟进中');
 assert.equal(ctx.aiFindingTransition({status:'跟进中'},null).verificationPending,true);
 assert.equal(ctx.aiFindingTransition({status:'跟进中'},{kind:'active',complete:true,evidence:['同一来源仍有问题']}).status,'跟进中','无新状态不能重置为未开始');
 assert.equal(ctx.aiFindingTransition({status:'已转办'},{kind:'active',complete:true,evidence:['原问题仍有依据']}).status,'已转办','已承接执行单不因再次提及而重新开启');
 const observed={kind:'active',complete:true,evidence:['仅证明同一问题仍然存在']};
 assert.equal(ctx.aiFindingTransition(null,observed).status,'','首次命中不默认未开始');
 assert.equal(ctx.aiFindingTransition({status:'待跟进'},observed).status,'','旧版泛化状态不能充当未开始证据');
 assert.equal(ctx.aiFindingTransition(null,null).status,'','首次缺数不制造进度');
 assert.equal(ctx.aiFindingTransition({status:'已暂停',evidence:['原暂停安排']},observed).status,'已暂停');
 assert.equal(ctx.aiFindingTransition({status:'已暂停',evidence:['原暂停安排']},observed).evidence[0],'原暂停安排','重复命中的事实不替换原进度依据');
 assert.equal(ctx.aiFindingTransition({status:'已解决'},observed).status,'','再次发现问题不自动推断已开始处理');
 for(const [kind,status] of [['pending','未开始'],['progress','跟进中'],['paused','已暂停'],['verification','待验证']]){
  assert.equal(ctx.aiFindingTransition(null,{kind,complete:true,evidence:['本事项明确处置记录']}).status,status);
  assert.throws(()=>ctx.aiFindingTransition(null,{kind,complete:true,evidence:[]}));
 }
 assert.throws(()=>ctx.aiFindingTransition(null,{kind:'resolved',complete:true,evidence:[]}));
 assert.equal(ctx.aiFindingTransition(null,{kind:'transferred',complete:true,evidence:['原执行单']}).status,'已转办');
 assert.equal(ctx.aiFindingTransition(null,{kind:'not_hit',complete:true,evidence:['新灯色']}).status,'不再命中');
 let exited=ctx.aiFindingTransition({status:'跟进中'},{kind:'not_hit',complete:true,evidence:['项目取消']});exited=ctx.aiFindingTransition(exited,{kind:'not_hit',complete:true,evidence:['仍为取消']});assert.equal(exited.lastActiveStatus,'跟进中','退出后反复核对仍保留原业务进度');
 assert.equal(ctx.aiFindingGroupStatus([{status:'已解决'},{status:'待验证'}]),'跟进中','一项验收不能关闭其他故障');
 assert.equal(ctx.aiFindingGroupStatus([{status:'已解决'},{status:'不再命中'}]),'跟进中','不再命中不等于解决');
 assert.equal(ctx.aiFindingGroupStatus([{status:'已解决'},{status:'已解决'}]),'已解决');
 assert.equal(ctx.aiFindingGroupStatus([]),'待核实');
 assert.equal(first.payload.problem,'原问题');

 await page.clock.install({time:new Date('2026-11-05T02:30:00Z')});await page.reload();
 await page.locator('[data-gd-part="execution"]').click();
 await page.locator('#gd-date-trigger').click();await page.locator('#up-date-popover [data-range-preset="yesterday"]').click();
 const take=()=>page.evaluate(()=>{const d=globalDiagnosisAudit();return {reports:d.reports.map(r=>({id:r.id,date:r.date,content:r.content})),deviations:d.deviations.map(r=>({id:r.id,date:r.date,sources:r.sources})),tasks:d.tasks.map(r=>r.task),versions:aiResultHistoryAudit().streams.global.revisions.length}});
 const before=await take();assert.equal(before.reports.filter(r=>r.type!=='周报').length,5);
 for(let i=0;i<3;i++)await page.locator('#refreshai').click();
 const refreshed=await take();assert.equal(refreshed.versions,before.versions,'重复刷新不追加相同版本');
 assert.deepEqual(refreshed.tasks,before.tasks,'AI刷新不回写手工任务');
 await page.clock.setFixedTime(new Date('2026-11-06T02:30:00Z'));await page.reload();
 await page.locator('[data-gd-part="execution"]').click();await page.locator('#gd-date-trigger').click();
 const day=page.locator('#up-date-popover [data-range-date="2026-11-04"]').last();await day.click();await day.click();
 const after=await take();assert.deepEqual(after.reports,before.reports,'跨日重载保留原日报及ID');
 assert.deepEqual(after.deviations.map(r=>r.sources),before.deviations.map(r=>r.sources),'历史业务日不混入后来依据');
 await page.locator('[data-gd-part="coordination"]').click();assert(await page.locator('[data-gd-follow-status] option[value="all"]').count(),'使用既有下拉切换全部记录');
}
