import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {businessRuleContext,revealBusinessRule} from './business-rules-context.mjs';

function verifyResultModel(){
 const memory=new Map(),ctx=businessRuleContext({localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),ctx);
 const defaults=vm.runInContext('({...brcDefaults})',ctx),conditions=ctx.brcDefaultConditions(defaults);
 assert.equal(ctx.brcValidate(defaults,conditions),null);
 assert.equal(ctx.brcResultOp('grade-S',conditions),'all');assert.equal(ctx.brcResultOp('quality-worsening',conditions),'all');assert.equal(ctx.brcResultOp('quality-worsening-rate',conditions),'any');
 assert.equal(ctx.brcResultMatch('quality-return',{orders:99,returnDelta:4}),false);
 assert.equal(ctx.brcResultMatch('quality-return',{orders:100,returnDelta:4}),true);
 assert.equal(ctx.brcResultMatch('stock-platform',{profitRate:20,returnRate:10,receivedRate:1,violationCount:3,value:3}),true,'次数是高危库存组的一项');
 for(const [orders,returnDelta,contactDelta,hit] of [[100,4,0,true],[0,4,0,false],[0,0,21,true],[100,0,0,false],[100,3,20,false]])assert.equal(ctx.brcResultMatch('quality-risk',{orders,returnDelta,contactDelta,value:contactDelta}),hit,'合组合并保持旧版括号和边界');
 let quality=ctx.brcCopyConditions(conditions);quality['quality.contactDelta'].groupOp='all';ctx.brcCommit('products',defaults,quality);
 assert.equal(ctx.brcResultMatch('quality-risk',{orders:100,returnDelta:4,value:0}),false);
 assert.equal(ctx.brcResultMatch('quality-risk',{orders:100,returnDelta:4,value:21}),true);
 ctx.brcCommit('products',defaults,conditions);
 let draft=ctx.brcCopyConditions(conditions);draft['quality.worsenReturn'].groupOp='all';ctx.brcCommit('products',defaults,draft);
 assert.equal(ctx.brcResultMatch('quality-worsening',{netSales:101,returnDelta:4,receivedDelta:0}),true,'退货恶化采用固定入榜规则，不由本地配置改变');
 assert.equal(ctx.brcRead().conditions['quality.worsenReturn'].groupOp,undefined,'不可编辑字段不保存草稿覆盖');
 draft=ctx.brcCopyConditions(conditions);draft['grades.S.salesAbove'].groupOp='any';ctx.brcCommit('new',defaults,draft);assert.notEqual(ctx.brcRead().conditions['grades.S.salesAbove'].groupOp,'any','SABC外部配置不能由本地草稿覆盖');
 draft=ctx.brcCopyConditions(conditions);draft['new.quarterGsv']={op:'gt',a:600,groupOp:'any'};
 assert.equal(ctx.brcResultMatch('success-quarter',{gsv:550,profitRate:20,returnRate:5},draft),true);
 draft['new.profit'].groupSkip=true;draft['new.return'].groupSkip=true;draft=ctx.brcCopyConditions(draft);
 assert.equal(ctx.brcResultMatch('success-quarter',{gsv:550,profitRate:20,returnRate:5},draft),false,'删除条件后不再参与判定');
 draft['new.quarterGsv'].groupSkip=true;assert.match(ctx.brcValidate(defaults,draft).message,/至少保留/);
 assert.equal(memory.has('dashboard-business-rules-v2'),false,'不创建或覆盖旧版本存储');
}

export async function businessRuleResultGroups(page,{successOnly=false}={}){
 verifyResultModel();await page.getByRole('button',{name:'配置全局规则',exact:true}).click();
 const snapshot=()=>page.evaluate(()=>window.businessRuleConfigSnapshot()),runtime=()=>page.evaluate(()=>window.businessRuleRuntimeSnapshot());
 const modal=page.locator('#brcs-editor');
 const openSuccess=async()=>{await page.locator('[data-brc-tab="new"]').click();await page.locator('[data-brc-new-tab="success"]').click();await page.locator('[data-brcs-edit]').click()};
 const save=async()=>{if(await modal.isVisible()){await modal.locator('[data-brcs-save]').click();await modal.waitFor({state:'detached'});await page.locator('[data-brcs-edit]').click()}else{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);assert.equal(await page.locator('#brc-error').innerText(),'')}};
 const editor=id=>page.locator('[data-brc-result-group="'+id+'"]'),relation=(id,op)=>editor(id).locator('[data-brc-result-join]').first().selectOption(op);
 assert.equal(await page.locator('[data-brc-new-tab=grade]').count(),0,'SABC不再提供本地编辑入口');
 await openSuccess();await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-success-modal.png',import.meta.url))});
 for(const group of await page.locator('.brc-success-table [data-brc-result-group]').all()){assert.equal(await group.locator('.brc-condition-when').count(),1);assert.equal(await group.locator('[data-brc-add]').count(),1);}
 await page.locator('[data-brc-field="new.quarterGsv"]').fill('600');await save();assert.equal((await runtime()).new550,false);
 await relation('success-quarter','any');await save();assert.equal((await runtime()).new550,true,'组内或关系参与新品成功判定');
 await relation('success-quarter','all');await save();assert.equal((await runtime()).new550,false);
 await editor('success-quarter').locator('[data-brc-remove="new.quarterGsv"]').click();await save();assert.equal((await runtime()).new550,true,'删除首条条件也按剩余条件判定');
 await editor('success-quarter').locator('[data-brc-add]').click();await editor('success-quarter').locator('[data-brc-op="new.quarterGsv"]').selectOption('gte');await editor('success-quarter').locator('[data-brc-field="new.quarterGsv"]').fill('600');await save();assert.equal((await runtime()).new550,false,'删除后可重新添加首指标');
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await openSuccess();assert.equal((await snapshot()).draftConditions['new.quarterGsv'].groupOp,'all');await modal.locator('[data-brcs-close]').last().click();await modal.waitFor({state:'detached'});
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-success-view.png',import.meta.url))});
 if(successOnly)return;
 await revealBusinessRule(page,'quality.returnDelta');
 const quality=editor('quality-risk');assert.equal(await quality.locator('.brc-condition-clause').count(),3);assert.equal(await quality.locator('[data-brc-add]').count(),1);assert.equal(await quality.locator('.brc-condition-when').count(),1);
 assert.equal(await quality.locator('.brc-condition-nested').count(),0,'当A且B或C连续显示在同一组，不单独框住前两项');
 const positions=await quality.locator('[data-brc-metric]').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().left));assert(Math.max(...positions)-Math.min(...positions)<1,'三行指标列对齐');
 await quality.locator('[data-brc-result-join="quality-return"]').selectOption('any');assert.equal(await quality.locator('.brc-condition-nested').count(),0,'全或关系也不分框');
 await quality.locator('[data-brc-result-join="quality-risk"]').selectOption('all');assert.equal(await quality.locator('.brc-condition-nested').count(),1,'保留不能省略的（A或B）且C括号含义');await page.locator('[data-brc-cancel]').click();
 assert.equal(await page.locator('.brc-metric-table thead th').count(),1,'移除左侧规则列');
 let actual=await runtime();assert.equal(actual.qualityGroupReturn.hit,true);assert.equal(actual.qualityGroupContact.hit,true);
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-quality-group.png',import.meta.url))});
 await quality.locator('[data-brc-result-join="quality-risk"]').selectOption('all');await save();actual=await runtime();assert.equal(actual.qualityGroupReturn.hit,false);assert.equal(actual.qualityGroupContact.hit,false);assert.equal(actual.qualityGroupBoth.hit,true,'外层且关系参与品质入榜判定');
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await revealBusinessRule(page,'quality.returnDelta');assert.equal(await quality.locator('[data-brc-result-join="quality-risk"]').inputValue(),'all');
 await quality.locator('[data-brc-result-join="quality-risk"]').selectOption('any');await quality.locator('[data-brc-add]').click();
 const added=quality.locator('[data-brc-metric="quality.contactDelta"]').last();await added.selectOption('orders');await quality.locator('[data-brc-term-op="quality.contactDelta"]').selectOption('gte');await quality.locator('[data-brc-upper="quality.contactDelta"]').fill('100');await save();
 assert.equal((await runtime()).qualityGroupReturn.hit,true);await quality.locator('[data-brc-remove="quality.contactDelta"]').last().click();await save();assert.equal((await runtime()).qualityGroupContact.hit,true);
 assert.equal(await editor('quality-worsening').count(),0,'固定退货恶化规则没有本地配置入口');
 assert.equal((await runtime()).worsening4.length,1,'本地条件编辑不改变固定退货恶化判定');
 await revealBusinessRule(page,'stock.profit');const stock=editor('stock-platform');assert.equal(await stock.locator('.brc-condition-when').count(),1);assert.equal(await stock.locator('[data-brc-add]').count(),1);assert.equal(await stock.locator('.brc-condition-clause').count(),4,'四项合并为同一条件组');assert.equal((await runtime()).stockMixedPlatform,1);assert.equal((await runtime()).stockOnlyViolation,1);
 assert.equal(await page.locator('.brc-metric-table th[scope=rowgroup]').allTextContents().then(labels=>labels.join('|')),'滞销|缺货|调货|高危库存');
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-stock-four-group.png',import.meta.url))});
 await relation('stock-platform','all');await save();assert.equal((await runtime()).stockMixedPlatform,0,'同一现场须满足整组库存高危条件');assert.equal((await runtime()).stockOnlyViolation,0,'次数不再绕过整组独立触发');assert.equal((await runtime()).stockAllFour,4);
 await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});await revealBusinessRule(page,'stock.profit');assert.equal(await stock.locator('[data-brc-result-join]').first().inputValue(),'all');
 await stock.locator('[data-brc-remove="stock.violations"]').click();await save();assert.equal((await runtime()).stockAllFour,3,'删除次数条件后不再作为独立风险原因');assert.equal((await runtime()).stockOnlyViolation,0);
 await relation('stock-platform','any');await stock.locator('[data-brc-add]').click();await stock.locator('[data-brc-metric="stock.profit"]').last().selectOption('violationCount');assert.equal(await stock.locator('[data-brc-row="stock.profit"] .brc-unit').last().innerText(),'次');await stock.locator('[data-brc-term-op="stock.profit"]').selectOption('gte');await stock.locator('[data-brc-upper="stock.profit"]').fill('3');await save();assert.equal((await runtime()).stockMissingRatiosViolation,1,'指标切换为次数时无需虚构经营比率');
 await page.setViewportSize({width:390,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'合并条件后窄屏仍只在表格内滚动');
}

// 新品规则回归可独立运行，不依赖已移除的其他对象配置入口。
export async function businessRuleSuccessGroups(page){return businessRuleResultGroups(page,{successOnly:true})}
