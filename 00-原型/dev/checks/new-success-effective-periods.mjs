import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {businessRuleContext} from './business-rules-context.mjs';

export function verifyEffectiveModel(){
 const memory=new Map();let fail=false;
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-31T04:00:00Z']))}}
 const ctx=businessRuleContext({Date:FixedDate,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('full');memory.set(k,v)}},boundedCache:()=>{const data=new Map();return {get:key=>data.get(key),set:(key,value)=>{data.set(key,value);return value}}}});
 const load=name=>vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8'),ctx);
 load('business-rules/01-store.js');load('business-rules/01-success-rule-store.js');load('new-products/01-success.js');
 const initial=JSON.parse(JSON.stringify(vm.runInContext('brcSaved.successTimeline',ctx)));
 assert.deepEqual(initial.quarter.map(row=>row.from),['2026-Q1'],'默认季度只有26/Q1起生效一条');
 assert.deepEqual(initial.year.map(row=>row.from),['2026'],'默认年度只有26年起生效一条');
 assert.equal(ctx.brcSuccessVisibleRules('quarter').length,1);assert.equal(ctx.brcSuccessVisibleRules('year').length,1);
 const copy=()=>ctx.brcCopyConditions(vm.runInContext('brcSaved.conditions',ctx));
 const pass=(gsv,annual,date,season='四季品')=>ctx.nspSuccessPass({gsvCents:gsv*1000000,profitRate:20,returnRate:5},season,annual,date);
 // 自然年天数、上市当日及闰年；利润率/总退率和季度门槛不折算。
 assert.equal(ctx.nspAnnualGsvPeriod('2026-07-01','2026-01-01').days,184);
 assert.equal(ctx.nspAnnualGsvPeriod('2024-02-29','2024-01-01').yearDays,366);
 assert.equal(ctx.nspAnnualGsvPeriod('2024-02-29','2024-01-01').days,307);
 assert.equal(ctx.nspAnnualGsvPeriod('2025-09-01','2026-01-01').ratio,1);
 assert.equal(ctx.nspAnnualGsvPeriod('2026-12-31','2026-01-01').days,1);
 assert.equal(ctx.nspAnnualGsvPeriod('2027-01-01','2026-01-01'),null);
 assert.equal(ctx.nspAnnualGsvPeriod('2026-02-30','2026-01-01'),null);
 const annualPass=(cents,season='四季品',launch='2026-07-01',margin=20,returns=5)=>ctx.nspSuccessPass({gsvCents:cents,profitRate:margin,returnRate:returns},season,true,'2026-01-01',launch);
 const threshold=2000*1000000*184/365;
 assert(annualPass(Math.ceil(threshold)));assert(!annualPass(Math.floor(threshold)),'不以展示舍入值判断门槛');
 assert(annualPass(1100*1000000));assert(!annualPass(1100*1000000,'四季品','2025-09-01'),'跨年滚入恢复全年门槛');
 assert(!annualPass(1100*1000000,'四季品','2026-07-01',11));assert(!annualPass(1100*1000000,'四季品','2026-07-01',20,61));
 const seasonal=750*1000000*184/365;assert(annualPass(Math.ceil(seasonal),'夏季品'));assert(!annualPass(Math.floor(seasonal),'冬季品'));
 assert(!ctx.nspSuccessPass({gsvCents:400*1000000,profitRate:20,returnRate:5},'四季品',false,'2026-07-01','2026-09-30'),'季度不按上市天数降低门槛');
 assert.throws(()=>ctx.brcSuccessSaveRule('quarter','2026-Q1',copy()),/已有规则/);
 assert.throws(()=>ctx.brcSuccessSaveRule('year','2026',copy()),/已有规则/);
 const q=copy();q['new.quarterGsv']={op:'gte',a:900};q['new.profit']={op:'gte',a:18};
 ctx.brcSuccessSaveRule('quarter','2027-Q1',q);assert(pass(550,false,'2026-10-01'));assert(!pass(550,false,'2027-01-01'));
 const year=copy();year['new.yearGsv']={op:'gte',a:3000};year['new.profit']={op:'gte',a:25};ctx.brcSuccessSaveRule('year','2028',year);
 assert(pass(2200,true,'2027-01-01'));assert(!pass(3200,true,'2028-01-01'),'年度有独立利润条件');assert(pass(1000,false,'2027-01-01'),'季度条件不受年度保存影响');
 ctx.brcSuccessSaveRule('quarter','2026-Q4',copy());
 const historical=copy();historical['new.quarterGsv']={op:'gte',a:700};ctx.brcSuccessSaveRule('quarter','2026-Q2',historical);
 assert(pass(550,false,'2026-01-01'));assert(!pass(550,false,'2026-04-01'));assert(!pass(550,false,'2026-07-01'));assert(pass(550,false,'2026-10-01'),'补录历史规则只到下一套规则接替前');
 assert.equal(ctx.brcSuccessRules('quarter').find(r=>r.from==='2026-Q2').status,'history');
 ctx.brcSuccessSaveRule('quarter','2027-Q3',q);ctx.brcSuccessSaveRule('quarter','2027-Q4',q,{originalFrom:'2027-Q3'});
 assert(!ctx.brcSuccessRules('quarter').some(r=>r.from==='2027-Q3'),'编辑期间移动，不留旧副本');
 ctx.brcSuccessDeleteRule('quarter','2027-Q1');assert(pass(550,false,'2027-01-01'),'删除后原规则延续');assert(!pass(550,false,'2027-10-01'),'后续方案不提前');
 assert.throws(()=>ctx.brcSuccessDeleteRule('quarter','2026-Q4'),/已生效/);assert.throws(()=>ctx.brcSuccessSaveRule('quarter','2028-Q1',q,{originalFrom:'2026-Q4'}),/生效期间不能修改/);
 ctx.brcSuccessSaveRule('quarter','2026-Q4',copy(),{originalFrom:'2026-Q4'});
 ctx.brcSuccessSaveRule('quarter','2026-Q2',historical,{originalFrom:'2026-Q2'});
 assert.throws(()=>ctx.brcSuccessSaveRule('quarter','2026-Q2',copy()),/已有规则/);
 assert.throws(()=>ctx.brcSuccessSaveRule('quarter','2026-Q2',q,{originalFrom:'2027-Q4'}),/已有规则/);
 const before=JSON.stringify(vm.runInContext('brcSaved',ctx));fail=true;assert.throws(()=>ctx.brcSuccessSaveRule('quarter','2029-Q1',q),/保存失败/);assert.equal(JSON.stringify(vm.runInContext('brcSaved',ctx)),before);fail=false;
 const timeline=JSON.stringify(vm.runInContext('brcSaved.successTimeline',ctx));ctx.brcSuccessSaveTarget(75);assert.equal(JSON.stringify(vm.runInContext('brcSaved.successTimeline',ctx)),timeline);assert.throws(()=>ctx.brcSuccessSaveTarget(-1),/0至100/);
 vm.runInContext('brcSaved=brcRead()',ctx);assert(!pass(550,false,'2027-10-01'),'保存及重新读取后仍按期间使用条件');
 // 历史补录后首次成功从Q1移到Q2，原始经营记录保持不变。
 const points=[{date:'2025-01-10',gsvCents:550000000,profitCents:110000000,sales:100,returned:1},{date:'2025-04-10',gsvCents:800000000,profitCents:160000000,sales:100,returned:1}];
 Object.assign(ctx,{upIdentity:r=>r,upFactsVersion:()=>1,pfIdentity:()=>({attribute:'四季品'}),iso:d=>d.toISOString().slice(0,10),upRuleRevision:1,upSummary:(r,start,end)=>({points:points.filter(p=>p.date>=start&&p.date<=end)})});
 const product={spuId:'retro-product',actualLaunch:'2025-01-01'};
 assert.equal(ctx.nspFirstNaturalQuarterSuccess(product,'2025-06-30').quarter,'2025-Q1');
 ctx.brcSuccessSaveRule('quarter','2025-Q1',historical);ctx.upRuleRevision++;
 assert.equal(ctx.nspFirstNaturalQuarterSuccess(product,'2025-06-30').quarter,'2025-Q2');assert.equal(points[0].gsvCents,550000000);
 const saved=JSON.parse(memory.get('dashboard-business-rules-v3'));saved.revision++;memory.set('dashboard-business-rules-v3',JSON.stringify(saved));assert.throws(()=>ctx.brcSuccessDeleteRule('quarter','2027-Q4'),/配置已更新/);
}

export async function newSuccessEffectivePeriods(page){
 verifyEffectiveModel();
 const keys=['dashboard-business-rules-v3','dashboard-business-rules-v2','dashboard-business-rules-v1'],old=await page.evaluate(keys=>keys.map(k=>[k,localStorage.getItem(k)]),keys);
 const boot=async()=>{await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready')};
 const open=async()=>{await page.evaluate(()=>location.hash='#system-business-rules');await page.locator('[data-brc-new-tab="success"]').click()};
 const snap=()=>page.evaluate(()=>businessRuleConfigSnapshot()),modal=page.locator('#brcs-editor');
 const add=async(year,q,value)=>{await page.locator('[data-brcs-create]').click();await modal.locator('[data-brcs-year]').fill(String(year));if(q)await modal.locator('[data-brcs-quarter]').selectOption(String(q));if(value!==undefined)await modal.locator('[data-brc-field="new.quarterGsv"]').fill(String(value));await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'})};
 try{
  await page.clock.setFixedTime(new Date('2026-10-31T04:00:00Z'));await page.evaluate(keys=>keys.forEach(k=>localStorage.removeItem(k)),keys);await boot();
  // 模拟截图里的旧浏览器记录：历史、当前和待生效混存；只重置成功时间线。
  await page.evaluate(()=>{
   const data=businessRuleConfigSnapshot(),conditions=data.successTimeline.baseline;
   const old={version:3,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,revision:8,values:{...data.values,'new.deliveryDays':21},conditions:data.conditions,successTimeline:{baseline:conditions,quarter:['2025-Q4','2026-Q1','2026-Q2','2026-Q3','2027-Q4','2028-Q4'].map(from=>({from,conditions})),year:['2025','2026','2027'].map(from=>({from,conditions}))}};
   localStorage.setItem('dashboard-business-rules-v3',JSON.stringify(old));
  });
  await boot();await open();
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-business-rules-v3')));
  assert.equal(migrated.successDefaultRevision,1);assert.equal(migrated.revision,9);
  assert.deepEqual(migrated.successTimeline.quarter.map(row=>row.from),['2026-Q1']);
  assert.deepEqual(migrated.successTimeline.year.map(row=>row.from),['2026']);
  assert.equal(migrated.values['new.deliveryDays'],21,'不清除其他配置');
  await boot();await open();
  assert.equal((await snap()).revision,9,'重复刷新不再重置');
  assert.equal(await page.locator('[data-brc-new-section="success"] [data-brc-bound]').count(),0,'主页面条件只读');assert(await page.locator('.brc-footer').isHidden());assert.equal(await page.locator('[data-brcs-target]').inputValue(),'66');
  assert.deepEqual(await page.locator('[data-brcs-record] option').allTextContents(),['26/Q1'],'初始季度规则显示26/Q1');
  assert.match(await page.locator('.brcs-choice-display').innerText(),/当前生效[\s\S]*26\/Q1/);
  assert.equal((await snap()).successTimeline.quarter[0].from,'2026-Q1');
  await page.locator('[data-brcs-kind="year"]').click();
  assert.deepEqual(await page.locator('[data-brcs-record] option').allTextContents(),['26年'],'默认年度只有26年');
  assert.equal((await snap()).successTimeline.year[0].from,'2026');
  await page.locator('[data-brcs-kind="quarter"]').click();
  await page.locator('[data-brcs-create]').click();await modal.locator('[data-brcs-quarter]').selectOption('1');
  assert.match(await modal.locator('[data-brcs-warning]').innerText(),/26\/Q1已有规则/);assert(await modal.locator('[data-brcs-save]').isDisabled());
  await modal.locator('[data-brcs-close]').first().click();await page.locator('.brcs-confirm [data-brcs-yes]').click();await modal.waitFor({state:'detached'});
  await page.locator('[data-brcs-edit]').click();assert(await modal.locator('[data-brcs-year]').isDisabled());assert(await modal.locator('[data-brcs-quarter]').isDisabled());
  assert.equal(await modal.locator('[data-brc-field="new.quarterGsv"]').inputValue(),'500');
  await modal.locator('[data-brc-field="new.quarterGsv"]').fill('520');await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'});
  assert.deepEqual(await page.locator('[data-brcs-record] option').allTextContents(),['26/Q1'],'编辑初始规则后不产生重复Q1');
  await add(2026,4,500);await add(2027,1,900);
  assert((await page.locator('[data-brcs-record] option').allTextContents()).every(text=>/^\d{2}\/Q[1-4]$/.test(text)),'下拉选项仅显示期间，状态留在分组和回显');
  assert.match(await page.locator('.brcs-choice-display').innerText(),/待生效[\s\S]*27\/Q1/);
  const centers=await page.locator('.brcs-selector > *').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return r.y+r.height/2}));
  assert(Math.max(...centers)-Math.min(...centers)<=2,'桌面规则选择与操作只占一行');
  assert.equal(await page.locator('.brcs-selected-meta').count(),0,'移除单独的状态说明行');
  await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-success-compact.png',import.meta.url))});
  assert.equal(await page.locator('[data-brcs-record]').inputValue(),'2027-Q1');assert.equal(await page.locator('.brcs-status').innerText(),'待生效');assert(await page.locator('[data-brcs-edit]').isVisible());
  await page.locator('[data-brcs-record]').selectOption('2026-Q4');assert.equal(await page.locator('[data-brcs-edit]').count(),1);assert.equal(await page.locator('[data-brcs-delete]').count(),0);assert.match(await page.locator('.brcs-readonly-table').innerText(),/500/);assert.doesNotMatch(await page.locator('.brcs-readonly-table').innerText(),/900/);
  await page.locator('[data-brcs-record]').selectOption('2027-Q1');await page.locator('[data-brcs-edit]').click();assert.equal(await modal.locator('[data-brc-field="new.quarterGsv"]').inputValue(),'900');await modal.locator('[data-brcs-year]').fill('2028');await modal.locator('[data-brc-field="new.quarterGsv"]').fill('950');await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'});
  assert(!(await snap()).successTimeline.quarter.some(r=>r.from==='2027-Q1'));assert.equal(await page.locator('[data-brcs-record]').inputValue(),'2028-Q1');
  await page.locator('[data-brcs-delete]').click();await page.locator('.brcs-confirm [data-brcs-no]').click();assert((await snap()).successTimeline.quarter.some(r=>r.from==='2028-Q1'));
  await page.locator('[data-brcs-delete]').click();await page.locator('.brcs-confirm [data-brcs-yes]').click();assert(!(await snap()).successTimeline.quarter.some(r=>r.from==='2028-Q1'));
  await add(2026,2,700);assert.equal(await page.locator('.brcs-status').innerText(),'历史规则');assert.equal(await page.locator('[data-brcs-edit]').count(),1);assert.equal(await page.locator('[data-brcs-delete]').count(),0);
  await page.locator('[data-brcs-edit]').click();assert.equal(await modal.locator('[data-brc-field="new.quarterGsv"]').inputValue(),'700');
  assert(await modal.locator('[data-brcs-quarter]').isDisabled());assert.match(await modal.locator('[data-brcs-impact]').innerText(),/26\/Q2.*26\/Q4/);
  await modal.locator('[data-brc-field="new.quarterGsv"]').fill('725');await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'});
  assert.equal((await snap()).successTimeline.quarter.find(r=>r.from==='2026-Q2').conditions['new.quarterGsv'].a,725);
  await page.locator('[data-brcs-create]').click();await modal.locator('[data-brcs-quarter]').selectOption('2');
  assert.match(await modal.locator('[data-brcs-warning]').innerText(),/26\/Q2已有规则/);assert(await modal.locator('[data-brcs-save]').isDisabled());
  await modal.locator('[data-brcs-close]').first().click();await page.locator('.brcs-confirm [data-brcs-yes]').click();await modal.waitFor({state:'detached'});
  const quarter=JSON.stringify((await snap()).successTimeline.quarter);await page.locator('[data-brcs-kind="year"]').click();await page.locator('[data-brcs-create]').click();await modal.locator('[data-brcs-year]').fill('2028');await modal.locator('[data-brc-field="new.yearGsv"]').fill('3000');await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'});assert.equal(JSON.stringify((await snap()).successTimeline.quarter),quarter);
  // 目标单独保存，不改变季度/年度方案或考核结果。
  const versions=JSON.stringify((await snap()).successTimeline);await page.locator('[data-brcs-target]').fill('75');await page.locator('[data-brcs-target-save]').click();assert.equal((await snap()).values['new.successRate'],75);assert.equal(JSON.stringify((await snap()).successTimeline),versions);
  // 无效期间及保存失败保留输入；关闭草稿时确认放弃。
  await page.locator('[data-brcs-create]').click();await modal.locator('[data-brcs-year]').fill('12');await modal.locator('[data-brcs-save]').click();assert.match(await modal.locator('#brcs-error').innerText(),/生效期间/);
  await modal.locator('[data-brcs-year]').fill('2029');await page.evaluate(()=>{window.brcsNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard-business-rules-v3')throw Error('full');return window.brcsNativeSet.call(this,k,v)}});
  await modal.locator('[data-brcs-save]').click();assert.match(await modal.locator('#brcs-error').innerText(),/保存失败/);assert.equal(await modal.locator('[data-brcs-year]').inputValue(),'2029');await page.evaluate(()=>{Storage.prototype.setItem=window.brcsNativeSet;delete window.brcsNativeSet});
  await modal.locator('[data-brcs-close]').first().click();await page.locator('.brcs-confirm [data-brcs-no]').click();assert(await modal.isVisible());await page.keyboard.press('Escape');await page.locator('.brcs-confirm [data-brcs-yes]').click();await modal.waitFor({state:'detached'});
  await boot();await open();assert.equal(await page.locator('[data-brcs-record]').inputValue(),'2026-Q4','重新进入默认当前生效');
  for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#business-rule-page').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.locator('[data-brcs-create]').click();const box=await modal.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);await modal.locator('[data-brcs-close]').first().click()}
 }finally{
  await page.evaluate(({old})=>{if(window.brcsNativeSet)Storage.prototype.setItem=window.brcsNativeSet;old.forEach(([k,v])=>v===null?localStorage.removeItem(k):localStorage.setItem(k,v))},{old});await page.clock.setFixedTime(new Date());await page.setViewportSize({width:1920,height:1080});await boot();
 }
 console.log('通过：只读查看、重复期间拦截、初始/当前/历史编辑、待生效编辑/删除、季度年度隔离、历史补录与首次成功重算、目标独立、取消/失败/并发及窄屏。');
}
