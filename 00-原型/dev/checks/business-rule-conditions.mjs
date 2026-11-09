import {revealBusinessRule} from './business-rules-context.mjs';
import {verifyGradeHelp} from './key-products-help.mjs';
import {verifyKeyProductGrades} from './key-products-grades.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function conditionModel(){
 const memory=new Map(),ctx=vm.createContext({window:{},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});
 for(const file of ['00-definitions.js','00-refurb-cycle.js','00-condition-catalog.js','00-condition-math.js','00-score-rules.js','00-condition-runtime.js','00-result-groups.js','01-validation.js','01-store.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/'+file,import.meta.url),'utf8'),ctx);
 for(const [op,below,equal,above] of [['gt',false,false,true],['gte',false,true,true],['lt',true,false,false],['lte',true,true,false],['eq',false,true,false]])assert.deepEqual([3,4,5].map(x=>ctx.brcTestCondition({op,a:4},x)),[below,equal,above],op);
 const range={op:'between',a:3,b:5,lower:true,upper:false};assert.deepEqual([null,NaN,2,3,4,5].map(x=>ctx.brcTestCondition(range,x)),[false,false,false,true,true,false]);
 assert.equal(ctx.brcBandTone('attainment',null),'gray');assert.equal(ctx.brcBandTone('attainment',NaN),'gray');assert.equal(ctx.brcBandTone('attainment',79),'red');assert.equal(ctx.brcBandTone('attainment',80),'yellow');assert.equal(ctx.brcBandTone('attainment',100),'green');
 assert.equal(ctx.brcEditorDisplayValue(5000,'元'),.5);assert.equal(ctx.brcEditorSourceValue('.6','元'),6000);assert.equal(ctx.brcEditorSourceValue('.000001','元'),.01);assert.equal(ctx.brcEditorDisplayValue(600,'万元'),600);assert.equal(ctx.brcEditorUnit('%').label,'%');assert.equal(ctx.brcEditorUnit('万元').label,'w');
 const defaults=vm.runInContext('({...brcDefaults})',ctx),conditions=ctx.brcDefaultConditions(defaults),copy=()=>ctx.brcCopyConditions(conditions);
 let draft=copy();draft['lights.yellow']={op:'between',a:80,b:100,lower:true,upper:true};assert.match(ctx.brcValidate(defaults,draft).message,/重叠/,'100包含两侧时报错');
 draft=copy();draft['lights.red']={op:'lt',a:70};assert.match(ctx.brcValidate(defaults,draft).message,/未覆盖/);
 draft=copy();draft['lights.green']={op:'else'};assert.match(ctx.brcValidate(defaults,draft).message,/有效判定/);
 draft=copy();draft['quality.returnDelta']={op:'else'};assert.match(ctx.brcValidate(defaults,draft).message,/有效判定/);
 draft=copy();draft['quality.returnDelta']={op:'between',a:3,b:5,lower:true,upper:false};ctx.brcCommit('products',defaults,draft);
 assert.equal(ctx.brcMatch('quality.returnDelta',3),true);assert.equal(ctx.brcMatch('quality.returnDelta',5),false);assert.equal(ctx.brcRead().conditions['quality.returnDelta'].op,'all');
 draft=ctx.brcCopyConditions(ctx.brcRead().conditions);draft['grades.S.salesAbove']={op:'gte',a:650};ctx.brcCommit('new',defaults,draft);assert.equal(ctx.brcProductGrade(650,13,'month'),'S');assert.equal(ctx.brcProductGrade(650,null),null);
 assert.match(ctx.brcDescribe('quality.returnDelta'),/≥3% 且 ＜5%/);
 // 改成“小于”后，未知核心链接和缺失销售额仍不能作为0参与判定。
 vm.runInContext("const klcCatalog=[],sampleSpus=[];function dashboardSyncDate(){return '2026-10-22'}",ctx);vm.runInContext(fs.readFileSync(new URL('../../src/modules/core-link-config/01-model.js',import.meta.url),'utf8'),ctx);
 vm.runInContext("klcStore.records.push({shopId:'1',linkId:'1',versions:[{from:'2025-01-01',to:null,name:'待补数据'}]});",ctx);
 draft=ctx.brcCopyConditions(ctx.brcRead().conditions);draft['shops.pddCount']={op:'lt',a:3};ctx.brcCommit('shops',defaults,draft);assert.equal(ctx.klcAssessedLinks({channel:'拼多多',shopId:1},'2026-10-22')[0].assessment,'unknown');
 const successSource=fs.readFileSync(new URL('../../src/modules/new-products/01-success.js',import.meta.url),'utf8');vm.runInContext(successSource.match(/function nspSuccessPass[\s\S]+?\n}/)[0],ctx);
 draft=ctx.brcCopyConditions(ctx.brcRead().conditions);draft['new.quarterGsv']={op:'lt',a:500};ctx.brcCommit('new',defaults,draft);assert.equal(ctx.nspSuccessPass({gsvCents:null,profitRate:20,returnRate:5},'四季品',false),false);

 // 同一组不同指标不混算单位，且/或与分级区域使用相同谓词。
 const mixed={op:'all',conditions:[{metric:'gsv',op:'gte',a:500},{metric:'profitRate',op:'gte',a:12}]};
 assert.equal(ctx.brcPredicateTest(mixed,'gsv',{gsv:550,profitRate:20}),true);assert.equal(ctx.brcPredicateTest(mixed,'gsv',{gsv:550,profitRate:10}),false);assert.equal(ctx.brcPredicateBoxes(mixed,'gsv').length,1);assert.equal(ctx.brcNamedConditionText('new.quarterGsv',mixed),'GSV≥500万元 且 利润率≥12%');
 const branch={op:'any',conditions:mixed.conditions};assert.equal(ctx.brcPredicateTest(branch,'gsv',{gsv:100,profitRate:20}),true);assert.equal(ctx.brcPredicateBoxes(branch,'gsv').length,2);
 draft=ctx.brcCopyConditions(ctx.brcRead().conditions);draft['new.quarterGsv']={metric:'profitRate',op:'gte',a:25};ctx.brcCommit('new',defaults,draft);
 assert.equal(ctx.nspSuccessPass({gsvCents:550000000,profitRate:20,returnRate:5},'四季品',false),false);assert.equal(ctx.nspSuccessPass({gsvCents:550000000,profitRate:30,returnRate:5},'四季品',false),true);
 draft=ctx.brcCopyConditions(ctx.brcRead().conditions);draft['new.quarterGsv']={metric:'profitRate',op:'gte',a:101};assert.match(ctx.brcValidate(defaults,draft).message,/利润率/);
 draft['new.quarterGsv']={metric:'unknown',op:'gte',a:10};assert.match(ctx.brcValidate(defaults,draft).message,/可用的指标/);

 const beforeLegacy=ctx.brcRead(),oldBands=ctx.brcCopyConditions(beforeLegacy.conditions);
 assert(Object.values(ctx.brcDefaultConditions(defaults)).every(condition=>condition.op!=='else'),'默认灯色全部使用明确条件');
 oldBands['lights.green']={op:'any',conditions:[{op:'gt',a:100},{op:'lt',a:0}]};oldBands['lights.yellow']={op:'all',conditions:[{op:'gte',a:40},{op:'lte',a:60}]};oldBands['lights.red']={op:'else'};
 const oldText=JSON.stringify({...beforeLegacy,conditions:oldBands});memory.set('dashboard-business-rules-v3',oldText);const migrated=ctx.brcRead();assert(migrated,'旧兜底多段范围可迁移');assert.equal(migrated.values['finance.deduction'],beforeLegacy.values['finance.deduction']);assert.equal(memory.get('dashboard-business-rules-v3'),oldText,'读取保留旧存储');
 assert.equal(migrated.conditions['lights.red'].op,'any');assert.equal(migrated.conditions['lights.red'].conditions.length,2);
 for(const [value,expected] of [[-1,false],[0,true],[39,true],[40,false],[60,false],[61,true],[100,true],[101,false]])assert.equal(ctx.brcTestCondition(migrated.conditions['lights.red'],value),expected,'明确补集保留开闭边界 '+value);

}
export async function businessRuleConditions(page){
 conditionModel();await page.getByRole('button',{name:'配置全局规则',exact:true}).click();await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'quality.contactDelta');
 const key='quality.contactDelta',runtime=()=>page.evaluate(()=>window.businessRuleRuntimeSnapshot()),op=value=>page.locator('[data-brc-op="'+key+'"]').selectOption(value),a=value=>page.locator('[data-brc-field="'+key+'"]').fill(String(value)),b=value=>page.locator('[data-brc-upper="'+key+'"]').fill(String(value));
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);assert.equal(await page.locator('#brc-error').innerText(),'')};
 for(const [operator,expected] of [['gte',true],['gt',false],['lte',true],['lt',false],['eq',true]]){await op(operator);await a(4);await save();assert.equal((await runtime()).contactGrowth4,expected,operator+'指标条件实际生效');}
 await op('gte');await page.locator('[data-brc-result-join="quality-risk"]').selectOption('all');await page.locator('[data-brc-add="'+key+'"]').click();await a(4);await b(5);await save();assert.equal((await runtime()).contactGrowth4,true);
 await op('gt');await save();assert.equal((await runtime()).contactGrowth4,false);
 await a(3);await b(4);await page.locator('[data-brc-term-op="'+key+'"]').selectOption('lte');await save();assert.equal((await runtime()).contactGrowth4,true);
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'quality.contactDelta');assert.equal(await page.locator('[data-brc-op="'+key+'"]').inputValue(),'gt');assert.equal((await runtime()).contactGrowth4,true);
 await b(2);await page.locator('[data-brc-save]').click();assert.match(await page.locator('#brc-error').innerText(),/条件无法同时满足/);assert.equal((await runtime()).contactGrowth4,true,'无效草稿不影响已保存规则');await page.locator('[data-brc-cancel]').click();assert.equal(await page.locator('[data-brc-upper="'+key+'"]').inputValue(),'4');
 for(const group of ['new','products','shops','stock','projects']){await page.locator('[data-brc-tab='+group+']').click();assert.equal(await page.locator('#brc-cards label').evaluateAll(labels=>labels.some(l=>/上限|下限/.test(l.textContent))),false);assert(await page.locator('#brc-cards input[data-brc-unit]').evaluateAll(nodes=>nodes.every(input=>{const source=input.dataset.brcUnit,expected=['元','万元'].includes(source)?'w':source;return input.parentElement.querySelector('.brc-unit')?.textContent===expected})), '单位随指标显示 '+group);for(const select of await page.locator('[data-brc-op]').all())assert.deepEqual(await select.locator('option').evaluateAll(options=>options.map(o=>o.textContent)),['>','≥','<','≤','=']);}
 await page.locator('[data-brc-tab=shops]').click();assert.equal(await page.getByRole('tab',{name:'处罚与单品退货',exact:true}).count(),0);
 await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'quality.contactDelta');await page.setViewportSize({width:390,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'区间控件窄屏不溢出');await page.setViewportSize({width:1920,height:1080});
 await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'lights.return.green');await page.locator('[data-brc-field="lights.return.green"]').fill('');await page.locator('[data-brc-field="lights.return.green"]').fill('0.2');assert.equal(await page.locator('[data-brc-field="lights.return"]').inputValue(),'0.2','清空后重填仍同步共享边界');await page.locator('[data-brc-cancel]').click();
 // 侧栏验证缩进、真实折叠与菜单/页面独立命名。
 const group=page.locator('.lt-menu-group').filter({has:page.locator('summary',{hasText:'目标管理'})});const inset=await group.evaluate(el=>parseFloat(getComputedStyle(el.querySelector('a')).paddingLeft)-parseFloat(getComputedStyle(el.querySelector('summary')).paddingLeft));assert(inset>=16,'二级菜单缩进明显');await group.locator('summary').click();assert.equal(await group.locator('a').first().isVisible(),false);await group.locator('summary').click();assert(await group.locator('a').first().isVisible());
 await page.getByRole('link',{name:'供应商导入',exact:true}).click();assert.equal(await page.locator('#ssi-page .sm-page-title').innerText(),'战略合作供应商名单');assert.equal(await page.locator('.lt-sidebar [aria-current=page]').innerText(),'供应商导入');
}

export async function businessRuleGrades(page){
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href="#matrix"]').click();
 const initial=await page.evaluate(()=>dashboardKeyProductsSnapshot());await verifyGradeHelp(page);await verifyKeyProductGrades(page,initial);
}

export async function businessRuleCompound(page){
 const memory=new Map(),ctx=vm.createContext({localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}});
 for(const file of ['00-definitions.js','00-refurb-cycle.js','00-condition-catalog.js','00-condition-math.js','00-score-rules.js','00-condition-runtime.js','00-result-groups.js','01-validation.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/'+file,import.meta.url),'utf8'),ctx);
 const defaults=vm.runInContext('({...brcDefaults})',ctx),legacy=ctx.brcDefaultConditions(defaults);legacy['grades.B.salesAbove']={op:'between',a:60,b:300,lower:false,upper:false};
 const legacyText=JSON.stringify({version:2,revision:7,values:defaults,conditions:legacy});memory.set('dashboard-business-rules-v2',legacyText);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.brcRead().conditions['grades.B.salesAbove'].op,'all');assert.equal(ctx.brcRead().version,3);assert.equal(memory.get('dashboard-business-rules-v2'),legacyText,'迁移保留旧存储');
 for(const x of [null,NaN])assert.equal(ctx.brcTestCondition(ctx.brcRead().conditions['grades.B.salesAbove'],x),false);for(const x of [60,300])assert.equal(ctx.brcTestCondition(ctx.brcRead().conditions['grades.B.salesAbove'],x),true);assert(ctx.brcTestCondition(ctx.brcRead().conditions['grades.B.salesAbove'],100));
 const c=ctx.brcCopyConditions(ctx.brcRead().conditions);c['grades.S.salesAbove']={op:'any',conditions:[{op:'gt',a:600},{op:'lt',a:30}]};ctx.brcCommit('new',defaults,c);
 for(const [mode,low,mid,high] of [['quarter',30,300,2100],['month',10,100,700],['recent30',10,100,700],['year',120,1200,8400]]){assert.equal(ctx.brcProductGrade(low,13,mode),'S');assert.equal(ctx.brcProductGrade(mid,13,mode),null);assert.equal(ctx.brcProductGrade(high,13,mode),'S')}
 assert.equal(ctx.brcGradeRules('year').S.salesRanges.length,2,'或分支保留独立图表区域');assert(memory.has('dashboard-business-rules-v3'));
 c['grades.S.salesAbove'].conditions[0].a=900;assert.equal(ctx.brcRead().conditions['grades.S.salesAbove'].conditions[0].a,600,'草稿与保存条件深拷贝隔离');
 let invalid=ctx.brcCopyConditions(ctx.brcRead().conditions);invalid['lights.green']={op:'any',conditions:[{op:'gt',a:100},{op:'lt',a:90}]};assert.match(ctx.brcValidate(defaults,invalid).message,/重叠/);
 invalid=ctx.brcCopyConditions(ctx.brcRead().conditions);invalid['quality.returnDelta']={op:'all',conditions:[{op:'gt',a:5},{op:'lt',a:2}]};assert.match(ctx.brcValidate(defaults,invalid).message,/条件无法同时满足/);
 assert.equal(ctx.brcCoversLine([{op:'all',conditions:[{op:'gt',a:1},{op:'lt',a:3}]},{op:'lte',a:1},{op:'gte',a:3}]),true);
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'quality.returnDelta');
 const key='quality.contactDelta',field=page.locator('[data-brc-field="'+key+'"]'),add=page.locator('[data-brc-add="'+key+'"]'),join=page.locator('[data-brc-result-join="quality-risk"]').first();
 const snap=()=>page.evaluate(()=>businessRuleConfigSnapshot()),runtime=()=>page.evaluate(()=>businessRuleRuntimeSnapshot());
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled)};
 await field.fill('5');await add.click();await join.selectOption('all');await page.locator('[data-brc-upper="'+key+'"]').fill('2');await page.locator('[data-brc-save]').click();assert.match(await page.locator('#brc-error').innerText(),/条件无法同时满足/);assert.equal((await runtime()).contactGrowth21,true,'无效草稿不改变实际判定');
 await join.selectOption('any');await save();assert.equal((await snap()).conditions[key].op,'any');assert.equal((await runtime()).contactGrowth4,false);assert.equal((await runtime()).contactGrowth1,true);assert.equal((await runtime()).contactGrowth6,true);
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'quality.returnDelta');assert.equal(await join.inputValue(),'any');assert.equal(await page.locator('[data-brc-upper="'+key+'"]').inputValue(),'2');
 await page.locator('[data-brc-remove="'+key+'"]').first().click();await save();assert.equal((await runtime()).contactGrowth6,false);assert.equal((await runtime()).contactGrowth1,true);assert.equal(await join.count(),1,'其余指标仍由同一组且或连接');
 await field.fill('7');await page.locator('[data-brc-cancel]').click();assert.equal(await field.inputValue(),'2');
 assert.equal(await page.locator('[data-brc-op] option[value=between]').count(),0,'各页不再提供区间控件');
 await page.setViewportSize({width:390,height:1080});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'添加条件后窄屏只在表格内滚动');
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-brc-tab=new]').click();await page.locator('[data-brc-new-tab=grade]').click();
 const sales='grades.S.salesAbove';
 // 兼容旧的(GSV>600或<30)且利润率>12，保留括号和图表空档。
 await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('dashboard-business-rules-v3'));data.conditions['grades.S.salesAbove']={op:'any',conditions:[{op:'gt',a:600},{op:'lt',a:30}]};data.revision++;localStorage.setItem('dashboard-business-rules-v3',JSON.stringify(data));});
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await page.locator('[data-brc-new-tab=grade]').click();
 assert.equal(await page.locator('[data-brc-row="'+sales+'"] .brc-condition-nested').count(),1,'旧混合条件显示括号层级');
 await page.locator('.head .brand').click();await page.locator('a[href="#matrix"]').click();
 const zones=await page.locator('#matrixchart rect[data-quadrant=S]').evaluateAll(nodes=>nodes.map(n=>({x:+n.getAttribute('x'),w:+n.getAttribute('width')})).sort((a,b)=>a.x-b.x));assert.equal(zones.length,2);assert(zones[0].x+zones[0].w<zones[1].x,'或条件之间的空档不涂成命中区域');
 const actual=await page.evaluate(()=>dashboardKeyProductsSnapshot());for(const row of actual.rows)assert.equal(row.level,row.facts.sales>0?ctx.brcProductGrade(row.facts.gsvCents/1000000,row.facts.profitRate,actual.period.mode):null,'或规则参与实际关键产品分级');

 // 历史兜底的补集有两个区间时，分组路径仍能增删并保存明确条件。
 await page.evaluate(()=>{
  const data=JSON.parse(localStorage.getItem('dashboard-business-rules-v3'));
  data.conditions['lights.return.green']={op:'any',conditions:[{op:'gt',a:100},{op:'lt',a:0}]};
  data.conditions['lights.return']={op:'all',conditions:[{op:'gte',a:40},{op:'lte',a:60}]};data.conditions['lights.return.red']={op:'else'};
  localStorage.setItem('dashboard-business-rules-v3',JSON.stringify(data));
 });
 await page.reload();await page.getByRole('button',{name:'配置全局规则',exact:true}).click();await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'lights.return.green');
 assert.equal(await page.locator('[data-brc-row="lights.return.red"] .brc-condition-nested').count(),2);assert.equal(await page.locator('#brc-cards option[value=else]').count(),0);assert(!/其余情况/.test(await page.locator('#brc-cards').innerText()));
 await page.locator('[data-brc-add="lights.return.red"][data-brc-path="0"]').click();const extra=page.locator('[data-brc-row="lights.return.red"] input[data-brc-path="0.2"]');await extra.fill('5');assert.equal((await snap()).draftConditions['lights.return.red'].conditions[0].conditions[2].a,5,'嵌套补集按路径更新原分组');await page.locator('[data-brc-remove="lights.return.red"][data-brc-path="0.2"]').click();
 await revealBusinessRule(page,'quality.worsenReturn');await page.locator('[data-brc-field="quality.worsenReturn"]').fill('11');await save();assert.equal(await page.locator('#brc-error').innerText(),'');
 assert.equal(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('dashboard-business-rules-v3')).conditions).some(c=>c.op==='else')),false,'保存后不再保留兜底条件');
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await page.locator('[data-brc-tab=products]').click();await revealBusinessRule(page,'lights.return.green');assert.equal(await page.locator('[data-brc-row="lights.return.red"] .brc-condition-nested').count(),2);
 await page.setViewportSize({width:390,height:1080});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'旧补集分组窄屏无页面横向溢出');

}
