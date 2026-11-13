import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyReturnBoundaries(){
 const context=businessRuleContext({boundedCache:()=>new Map(),esc:value=>String(value??''),upPercent:value=>Number.isFinite(value)?value.toFixed(1)+'%':'—',upMoney:String,stockQuantity:()=> '—',fmt:String,nspComparison:()=>({target:'环比 --',targetTone:'rp-quality-gray'}),ResizeObserver:class{}});
 for(const file of ['unified-product/01-aggregates.js','numeric-signals/01.js','risk-presentation/01-quality.js','risk-presentation/03-columns.js','key-products/09-detail-table.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),context);
 for(const [kind,target,lower,limit] of [['return',6,1,2],['received',8,.3,.5]]){
  for(const [gap,tone] of [[-1,'green'],[0,'green'],[lower-.0001,'green'],[lower,'yellow'],[limit,'yellow'],[limit+.0001,'red']]){
   const rule=context.rpQualityReturnRule(target+gap,target,kind);
   assert.equal(rule.targetTone,'rp-quality-'+tone,kind+'偏差边界');
   const cell=context.rpListCell({key:kind,value:(target+gap)+'%',...rule});
   assert(!cell.split('<strong')[1].split('</strong>')[0].includes('number-signal'),'退货主值无标签');
   assert.equal(cell.includes('number-signal--'),tone!=='green');
   assert(!context.rpTargetText(rule).includes('number-signal-text">偏差'),'偏差文字不能放入标签');
   const facts={returnRate:kind==='return'?target+gap:6,receivedRate:kind==='received'?target+gap:8};
   const key=kind==='return'?'returns':'received';
   const row=context.kpmTableMetrics({facts,previous:{},returnTarget:6,stock:{}}).find(cell=>cell.includes('data-kpm-metric="'+key+'"'));
   assert(!row.split('<strong')[1].split('</strong>')[0].includes('number-signal'),'关键产品必须传递主值字段身份');
   if(kind==='return')assert(row.includes('rp-quality-'+tone),'总退沿用配置目标');else{assert(row.includes('rp-quality-normal'),'已收退无统一目标时中性展示');assert(!row.includes('偏差'),'不生成无依据的已收退偏差');}
  }
 }
 for(const key of ['return','returns','returnRate','returned','received','receivedRate'])assert(!context.numberSignalMain({key,value:'12%',tone:'rp-quality-red'}).includes('number-signal'));
 assert(!context.rpTargetText({target:'环比 ↓12.3%',targetTone:'rp-quality-red'}).includes('number-signal'));
 assert.equal(context.rpQualityReturnRule(10.6,10).targetTone,'rp-quality-green','恶化榜同步绝对偏差规则');
}
function verifyReturnRuleUpgrade(){
 const memory=new Map(),ctx=businessRuleContext({localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}});
 const values=vm.runInContext('({...brcDefaults})',ctx),conditions=ctx.brcDefaultConditions(values);
 for(const [key,upper] of [['return',2],['received',.5]]){
  conditions['lights.'+key+'.green']={op:'lt',a:0};conditions['lights.'+key]={op:'between',a:0,b:upper,lower:true,upper:true};conditions['lights.'+key+'.red']={op:'else'};
 }
 memory.set('dashboard-business-rules-v2',JSON.stringify({version:2,revision:7,values:{...values,'finance.deduction':15,'quality.receivedTarget':8},conditions:{...conditions,'finance.deduction':{op:'gte',a:15}}}));
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),ctx);
 const upgraded=ctx.brcRead();assert.equal(upgraded.returnRuleRevision,1);assert.equal(upgraded.values['finance.deduction'],15);assert.equal('quality.receivedTarget' in upgraded.values,false,'旧目标配置不再读取');
 for(const [id,lower] of [['return',1],['received',.3]]){
  assert.equal(ctx.brcBandTone('return.'+id,lower-.0001),'green');assert.equal(ctx.brcBandTone('return.'+id,lower),'yellow');
 }
 // 修订后的用户配置不重复迁移覆盖。
 const draft=ctx.brcCopyConditions(upgraded.conditions);draft['lights.return.green']={op:'lt',a:.8};draft['lights.return']={op:'all',conditions:[{op:'gte',a:.8},{op:'lte',a:2}]};
 ctx.brcCommit('products',upgraded.values,draft);assert.equal(ctx.brcRead().conditions['lights.return.green'].a,.8);assert.equal(ctx.brcRead().values['finance.deduction'],15);
}
export async function returnPresentation(page){
 verifyReturnRuleUpgrade();verifyReturnBoundaries();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const verify=async locator=>{
  const result=await locator.evaluateAll(nodes=>({count:nodes.length,bad:nodes.filter(node=>node.querySelector('.number-signal')).length}));
  assert(result.count>0,'应存在退货率主值');assert.equal(result.bad,0,'退货主值不能带标签');
 };
 const rules=await page.evaluate(()=>window.businessRuleConfigSnapshot());assert(!rules.items.some(item=>item.key==='quality.receivedTarget'));assert(!('quality.receivedTarget' in rules.values));
 await verify(page.locator('#riskrail :is([data-rp-field="return"],[data-rp-field="received"]):not([data-comparison-first])>strong,#riskrail [data-comparison-first]>small'));
 await verify(page.locator('#matrixtable :is(.kpm-metric-returns,.kpm-metric-received) strong'));
 const verifyTable=async table=>{
  const result=await table.evaluate(table=>{
   const indexes=[...table.querySelectorAll('thead th')].flatMap((node,i)=>/^(总退|已收退)$/.test(node.textContent.trim())?[i]:[]);
   const cells=[...table.querySelectorAll('tbody tr')].flatMap(row=>indexes.map(i=>row.cells[i]).filter(Boolean));
   return {count:cells.length,badMain:cells.filter(cell=>cell.querySelector('strong .number-signal')).length,badGreen:cells.filter(cell=>cell.querySelector('.rp-quality-green .number-signal')).length,badLabel:cells.filter(cell=>[...cell.querySelectorAll('.number-signal')].some(node=>node.textContent.includes('偏差'))).length};
  });
  assert(result.count>0);assert.equal(result.badMain,0);assert.equal(result.badGreen,0);assert.equal(result.badLabel,0);
 };
 await verifyTable(page.locator('#newtable table'));await verifyTable(page.locator('#matrixtable table'));
 await page.locator('#riskrail [data-risk="0"]').click();
 for(const kind of [0,2,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();await verifyTable(page.locator('#dialogbody .rp-list-table'));
 }
 await page.locator('[data-drawer-tab="ranking-0"]').click();await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 await verify(page.locator('[data-up-metric="returned"] strong,[data-up-metric="received"] strong'));
 await page.locator('[data-drawer-tab="quality"]').click();
 assert.equal(await page.locator('[data-up-return-target="receivedTarget"]').count(),1);assert(/已收退目标/.test(await page.locator('.up-return-trend').innerText()));
 await verify(page.locator('[data-up-quality-metric="returned"] strong,[data-up-quality-metric="received"] strong'));
 await page.locator('#close').click();await page.locator('#close').click();
 console.log('通过：退货主值/偏差分层、红黄绿与1/2、0.3/0.5边界、新品/关键产品/三榜/详情一致，恶化榜统一规则及旧配置升级');
}
