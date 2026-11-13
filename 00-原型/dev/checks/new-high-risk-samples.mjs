import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function verifySampleHistory(){
 const storage=new Map(),box=vm.createContext({window:{},DATA_CUTOFF:'2026-10-28',qrPlatforms:['抖音','快手','视频号','天猫','京东','拼多多'],
  boundedCache:()=>new Map(),uiPeriodValidDate:value=>/^\d{4}-\d{2}-\d{2}$/.test(value||''),localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}});
 for(const name of ['risk-presentation/02-appearance-history.js','risk-presentation/02-appearance-samples.js','global-diagnosis/03-risk-alerts.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8'),box);
 const fixtures=vm.runInContext('rpWarningAppearanceSamples',box),sources=Array.from(fixtures,sample=>({key:sample.key}));
 assert(box.rpSeedWarningAppearanceSamples(sources,'2026-10-28'));box.rpRecordWarningAppearances(sources,'2026-10-28');
 let history=box.window.riskBoardAppearanceSnapshot();assert.equal(history.observedDates.length,1,'模拟快照不冒充全局实际采集日期');
 const samples=history.history.filter(row=>row.sample);assert.equal(samples.length,6);
 for(const record of samples)assert(box.gdRiskReminder(record,{},record.sampleListedAt||'2026-10-28'),'各样例在自己的发现日通过原出现窗口规则');
 const saved=storage.get(history.storageKey);assert.equal(box.rpSeedWarningAppearanceSamples(sources,'2026-10-28'),false);assert.equal(storage.get(history.storageKey),saved,'同日不重置样例历史');
 box.DATA_CUTOFF='2026-10-29';assert.equal(box.rpSeedWarningAppearanceSamples(sources,'2026-10-29'),false);box.rpRecordWarningAppearances(sources,'2026-10-29');
 history=box.window.riskBoardAppearanceSnapshot();
 for(const row of history.history.filter(row=>row.sample))assert.deepEqual(Array.from(row.appearances.slice(-2)),['2026-10-28','2026-10-29']);
 const justReminded=history.history.find(row=>row.sampleListedAt==='2026-10-28');
 assert.equal(box.gdRiskReminder(justReminded,{},'2026-10-29'),null,'提醒次日持续入榜时不重复提醒');
}

export async function newHighRiskSamples(page){
 verifySampleHistory();
 await page.clock.setFixedTime(new Date('2026-11-06T04:00:00Z'));
 // 首次启动已按运行当天采集；固定日期场景从独立历史起步。
 await page.evaluate(()=>localStorage.removeItem(riskBoardAppearanceSnapshot().storageKey));
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const snapshot=()=>page.evaluate(()=>({board:riskBoardAppearanceSnapshot(),risk:globalDiagnosisRiskSnapshot(),ai:globalDiagnosisAudit()}));
 const root=page.locator('#ai');await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="high-risk"]').click();
 let data=await snapshot();const samples=data.risk.rows.filter(row=>row.sample),keys=samples.map(row=>row.workKey);
 assert.equal(samples.length,6,JSON.stringify({range:data.risk.range,samples:samples.map(r=>[r.date,r.riskIdentity]),history:data.board.history.filter(r=>r.sample).map(r=>[r.sampleListedAt,r.kind,r.objectId])}));assert.deepEqual([...new Set(samples.map(row=>row.riskBoardKind))].sort((a,b)=>a-b),[0,1,2,3,4,6]);
 assert.deepEqual([...new Set(samples.map(row=>row.category))].sort(),['环境','清洁','个护&健康'].sort());
 assert.equal(samples.filter(row=>row.changeType==='新出现风险').length,3);assert.equal(samples.filter(row=>row.changeType==='风险复核').length,3);
 for(const row of samples){assert(data.risk.sources.some(source=>source.key===row.riskIdentity),'每条引用当前上方入榜对象');assert(row.sources.some(source=>source.sourceName.includes('演示样例')&&source.content.includes('模拟历史')));}
 assert.equal(await root.locator('[data-gd-key-work]').count(),data.risk.rows.length);
 const highStat=data.ai.counts[0].stats.find(([name])=>name==='新增高危');assert.equal(highStat[1],data.risk.rows.length);
 await root.locator('[data-gd-key-work="'+samples[0].workKey+'"] [data-gd-action="analysis"]').click();
 await page.locator('.gd-work-follow [data-gd-follow-evidence]').first().click();
 assert.match(await page.locator('#dialogbody').innerText(),/演示样例/);
 await page.locator('#close').click();
 const histories=data.board.history.filter(row=>row.sample).map(row=>[row.id,row.appearances]);
 for(let i=0;i<2;i++)await root.locator('#refreshai').click();assert.deepEqual((await snapshot()).risk.rows.filter(row=>row.sample).map(row=>row.workKey),keys);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});data=await snapshot();assert.deepEqual(data.board.history.filter(row=>row.sample).map(row=>[row.id,row.appearances]),histories,'重开不重写样例日期');
 // 已采集过昨日的旧浏览器也能一次性补充夹具，其他对象历史不变。
 await page.evaluate(()=>{const board=riskBoardAppearanceSnapshot(),records=Object.fromEntries(board.history.map(row=>[row.kind+'|'+row.objectId+'|'+row.platform,row]));for(const record of Object.values(records).filter(row=>row.sample)){record.appearances=['2026-10-27'];record.baseline=true;delete record.sample;delete record.sampleObservedDates}records['0|SPU-SOURCE-003|抖音']={id:'demo-warning|0|SPU-SOURCE-003|抖音',kind:0,objectId:'SPU-SOURCE-003',platform:'抖音',appearances:['2026-10-27'],baseline:false,sample:true,sampleObservedDates:['2026-10-26','2026-10-27']};records['3|untouched-demo|all']={kind:3,objectId:'untouched-demo',platform:'all',appearances:['2026-10-20'],baseline:true};localStorage.setItem(board.storageKey,JSON.stringify({records,observedDates:['2026-10-27'],sampleVersion:'new-high-risk-20261027-v1'}))});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});data=await snapshot();
 const priorIdentity='0|SPU-SOURCE-003|抖音';
 assert.equal(data.risk.rows.filter(row=>row.sample&&row.riskIdentity!==priorIdentity).length,6);
 assert.deepEqual(data.board.history.find(row=>row.objectId==='untouched-demo').appearances,['2026-10-20']);
 const prior=data.board.history.find(row=>row.kind===0&&row.objectId==='SPU-SOURCE-003'&&row.platform==='抖音');
 assert(prior.appearances.includes('2026-10-27'));
 assert.deepEqual(prior.sampleObservedDates,['2026-10-26','2026-10-27'],'不重写上一批样例的模拟历史');
 const priorReview=data.risk.rows.find(row=>row.riskIdentity===priorIdentity);
 if(data.risk.sources.some(row=>row.key===priorIdentity))assert.equal(priorReview?.previousReminderAt,'2026-10-27','上一批风险到期且在榜时进入复核');
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="high-risk"]').click();await root.screenshot({path:'outputs/new-high-risk-samples-20261028.png'});
 await page.clock.setFixedTime(new Date('2026-11-07T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});const nextRows=(await snapshot()).risk.rows.filter(row=>row.sample);assert(nextRows.every(row=>row.date!=='2026-11-07'),'次日连续出现不制造新发现日');assert.equal(new Set(nextRows.map(row=>row.workKey)).size,nextRows.length,'保留历史事件但不生成重复行');
 console.log('通过：六榜三链群、3首次/3复核、明确演示依据、上一批历史兼容不重置、刷新重开稳定、次日保留原事件且不重复新增。');
}
