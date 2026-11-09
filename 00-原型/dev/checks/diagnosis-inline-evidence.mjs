import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

export async function diagnosisInlineEvidence(page){
 const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const box=vm.createContext({document:{addEventListener(){}},esc,gdSourceDate:value=>/^\d{2}\//.test(String(value))?String(value):String(value||'').slice(2,10).replaceAll('-','/'),gdFollowDate:(row,key)=>row.followUp[key],gdReadableMarkup:esc,
  gdAnalysisSourceTable:sources=>'<div class="gd-analysis-sources"><table aria-label="来源与内容"><thead><tr><th>来源</th><th>内容</th></tr></thead><tbody>'+sources.map(s=>'<tr data-analysis-source="'+esc(s.id)+'"><td>'+esc(s.sourceName)+'</td><td>'+esc(s.content)+'</td></tr>').join('')+'</tbody></table></div>'});
 for(const name of ['03-followup','04-followup-view'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/'+name+'.js',import.meta.url),'utf8'),box);
 const example={followUp:{firstAt:'26/11/08',updatedAt:'26/11/09',checkedAt:'2026-11-09',records:[
  {at:'2026-11-08',previousAction:'原始首次识别说明',progress:'原始首次判断',judgement:'原始问题',status:'',action:'甲：核实安排',sources:[{id:'old-source',sourceName:'原系统记录',content:'首次诊断原文，不被新记录覆盖'}]},
  {at:'2026-11-09',previousAction:'甲：核实安排',progress:'已取得本事项处理反馈',judgement:'继续跟进剩余安排',status:'跟进中',action:'【明确完成安排】甲：补充完成日期',sources:[{id:'new-source',sourceName:'本次反馈',content:'第二次核对独立原文'+ '，保留原始反馈和完整位置。'.repeat(80)}]}
 ]},lifecycle:{status:'跟进中'},sources:[{id:'wrong-current',sourceName:'不能借用的当前来源',content:'不得替换历史'}]};
 const original=JSON.stringify(example);box.example=example;
 const markup=vm.runInContext('gdWorkFollowEvidence(example)',box);
 assert.equal(JSON.stringify(example),original,'展示不能清空或改写原始首轮判断');
 assert(markup.indexOf('data-gd-follow-record="1"')<markup.indexOf('data-gd-follow-record="0"'),'最新记录在前');
 assert.equal((markup.match(/gd-first-diagnosis/g)||[]).length,1);assert(!markup.includes('wrong-current'));
 // 用原来源渲染器作对照，核对真实记录的标签、名称、日期和完整内容。
 const oracle=vm.createContext({Intl,esc});
 for(const file of ['shared-classification/02-diagnosis-catalog.js','global-diagnosis/04-readable-text.js','global-diagnosis/05-source-location.js','global-diagnosis/05-analysis-details.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),oracle);
 const displayTerms=vm.runInNewContext(fs.readFileSync(new URL('../../src/modules/page-presentation/03-terminology.js',import.meta.url),'utf8').split('function formatDisplayedTerms')[0]+'\npresentationTermText');
 await page.locator('a[href="#ai"]').click();
 const baseline=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().historyRows));
 for(const [part,tab] of [['coordination','project'],['coordination','high-risk'],['resource','omission'],['resource','blocker'],['resource','solution'],['resource','focus-shift']]){
  await page.locator('[data-gd-part="'+part+'"]').click();await page.locator('[data-gd-tab="'+tab+'"]').click();
  oracle.actualSources=await page.evaluate(()=>globalDiagnosisAudit().visible[0].sources);
  const originalSourcesMarkup=displayTerms(vm.runInContext('gdAnalysisSourceTable(actualSources)',oracle));
  await page.locator('#ai .gd-analysis-table tbody tr [data-gd-action="analysis"]').first().click();
  const drawer=page.locator('.gd-evidence-dialog'),history=drawer.locator('.gd-work-follow'),table=history.locator('table[aria-label="问题跟进记录"]');
  assert.equal(await history.count(),1);assert.equal(await drawer.locator(':scope > .gd-detail-section > h5').allTextContents().then(labels=>labels.filter(t=>t==='来源依据').length),0,'不再单独重复来源表');
  assert.deepEqual(await table.locator(':scope > thead th').allTextContents(),['核对日期','此前待跟进事项','本次进展与判断','跟进状态','剩余行动及建议接手人','操作']);
  const first=table.locator('[data-gd-follow-record="0"]');
  for(const label of ['此前待跟进事项','本次进展与判断'])assert.equal(await first.locator('[data-label="'+label+'"]').innerText(),'暂无');
  assert.equal(await first.locator('.gd-first-diagnosis').innerText(),'首次诊断');assert.equal(await first.locator('.gd-first-diagnosis.tag').count(),0);
  assert((await page.locator('#dialog').boundingBox()).width>=1278,'六类业务抽屉统一加宽');
  const button=table.locator('[data-gd-follow-evidence]').first(),title=await page.locator('#dialogtitle').innerText();
  await button.click();assert.equal(await button.innerText(),'收起依据');assert.equal(await button.getAttribute('aria-expanded'),'true');
  assert.equal(await drawer.locator('.gd-follow-evidence-row:not([hidden])').count(),1);assert.equal(await page.locator('#dialogtitle').innerText(),title,'行内展开不打开第二层抽屉');
  const panel=drawer.locator('.gd-follow-evidence-row:not([hidden])');
  const content=await panel.evaluate((el,oldHtml)=>{
   const before=document.createElement('div');before.innerHTML=oldHtml;
   // 原界面与新界面都使用全局日期格式；只归一显示文本，不改来源标识。
   const normalized=value=>value.replace(/\b20(\d{2})-(\d{2})-(\d{2})\b/g,'$1/$2/$3');
   const take=root=>[...root.querySelectorAll('[data-analysis-source]')].map(row=>({id:row.dataset.analysisSource,source:normalized(row.querySelector('td:first-child').textContent),content:normalized((row.querySelector('.gd-follow-source-text')||row.querySelector('td:last-child')).textContent)}));
   return {before:take(before),after:take(el)};
  },originalSourcesMarkup);
  assert.deepEqual(content.after,content.before,'六类抽屉搬入子表前后，真实来源元数据及全文逐条一致');
  if(part==='coordination'&&tab==='project'){
   for(const more of await panel.locator('[data-gd-follow-source-more]').all())if(await more.isVisible())await more.click();
   await panel.screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-real-project-source.png',import.meta.url))});
  }
  await button.click();assert.equal(await drawer.locator('.gd-follow-evidence-row:not([hidden])').count(),0);
  await page.locator('#close').click();
 }
 // 用户可直接查看的独立演示行：两次记录分别绑定当次来源，不进入真实历史。
 await page.locator('[data-gd-part="resource"]').click();
 await page.locator('[data-gd-tab="omission"]').click();
 await page.locator('[data-gd-search]').fill('演示样例');
 const demo=page.locator('[data-gd-deviation="demo-omission-two-checks"]');
 assert.equal(await demo.count(),1);
 await demo.locator('[data-gd-action="analysis"]').click();
 // 多条建议应共用右侧内容列，不能被网格自动排回左侧标签列。
 const advice=page.locator('.gd-detail-advice');
 assert.equal(await advice.locator(':scope>.gd-action-content').count(),2);
 const adviceLayout=await advice.evaluate(el=>{
  const body=el.getBoundingClientRect();
  return [...el.children].map(child=>{const r=child.getBoundingClientRect();return {left:r.left,width:r.width,bodyLeft:body.left,bodyWidth:body.width}});
 });
 for(const item of adviceLayout){assert(Math.abs(item.left-item.bodyLeft)<1);assert(Math.abs(item.width-item.bodyWidth)<1,'每条建议占满右侧内容列');}
 const demoHistory=page.locator('.gd-work-follow');
 assert.equal(await demoHistory.locator('[data-gd-follow-record]').count(),2);
 const demoFirst=demoHistory.locator('[data-gd-follow-record="0"]');
 for(const label of ['此前待跟进事项','本次进展与判断','跟进状态'])assert.equal(await demoFirst.locator('[data-label="'+label+'"]').innerText(),'暂无');
 const demoLatest=demoHistory.locator('[data-gd-follow-record="1"]');
 assert.equal(await demoLatest.locator('[data-label="跟进状态"]').innerText(),'跟进中');
 for(const record of [demoLatest,demoFirst])await record.locator('[data-gd-follow-evidence]').click();
 assert.match(await demoHistory.locator('#gd-follow-evidence-0').innerText(),/老化检验记录未提交/);
 assert.match(await demoHistory.locator('#gd-follow-evidence-1').innerText(),/缺少检验人签字/);
 assert.equal(await page.evaluate(()=>JSON.stringify(aiResultHistoryAudit()).includes('demo-omission-two-checks')),false,'演示行不写入真实诊断历史');
 await demoHistory.screenshot({path:fileURLToPath(new URL('../../outputs/omission-two-checks-demo.png',import.meta.url))});
 await page.locator('#close').click();
 await page.locator('[data-gd-search]').fill('');
 await page.locator('#ai .gd-analysis-table tbody tr [data-gd-action="analysis"]').first().click();
 // 仅替换隔离浏览器中的展示夹具，不触碰原型数据及历史存储。
 await page.locator('.gd-work-follow').evaluate((el,html)=>{
  const fixture=document.createElement('div');fixture.innerHTML=html;
  el.querySelector('[data-gd-follow-scroll]').innerHTML=fixture.querySelector('[data-gd-follow-scroll]').innerHTML;
 },markup);
 const history=page.locator('.gd-work-follow'),scroll=history.locator('[data-gd-follow-scroll]'),latest=history.locator('[data-gd-follow-record="1"]');
 assert.equal(await history.locator('.gd-follow-record').first().getAttribute('data-gd-follow-record'),'1');
 await latest.locator('button').click();
 let sources=history.locator('#gd-follow-evidence-1');assert(await sources.isVisible());assert.match(await sources.innerText(),/第二次核对独立原文/);assert.doesNotMatch(await sources.innerText(),/首次诊断原文/);
 const more=sources.locator('[data-gd-follow-source-more]');assert(await more.isVisible());
 const originalText=await sources.locator('.gd-follow-source-text').textContent();
 await more.click();assert.equal(await more.innerText(),'收起原文');assert.equal(await sources.locator('.gd-follow-source-text').textContent(),originalText);
 assert(await sources.locator('.gd-follow-source-text').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'展开显示完整原文');await more.click();
 await history.locator('[data-gd-follow-record="0"] button').click();assert.match(await history.locator('#gd-follow-evidence-0').innerText(),/首次诊断原文/);
 for(const width of [1920,900,390]){
  await page.setViewportSize({width,height:1000});
  await page.waitForFunction(()=>{
   const el=document.querySelector('[data-gd-follow-scroll]'),content=el.querySelector('#gd-follow-evidence-1 .gd-follow-evidence-shell');
   return Math.abs(content.getBoundingClientRect().width-el.clientWidth)<=2;
  });
  for(const end of [false,true]){
   await scroll.evaluate((el,end)=>{el.scrollLeft=end?el.scrollWidth:0},end);
   const geometry=await scroll.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('#gd-follow-evidence-1 .gd-follow-evidence-shell').getBoundingClientRect(),op=el.querySelector('[data-gd-follow-record="1"] td:last-child').getBoundingClientRect();return {left:a.left,right:a.left+el.clientWidth,contentLeft:b.left,contentRight:b.right,contentWidth:b.width,viewport:el.clientWidth,opLeft:op.left,opRight:op.right}});
   assert(Math.abs(geometry.left-geometry.contentLeft)<=2,'主表横滑时子表仍贴住可视区左侧');
   assert(Math.abs(geometry.viewport-geometry.contentWidth)<=2,'展开区按可视宽度而不是六列总宽度');
   assert(geometry.opRight<=geometry.right+2&&geometry.opLeft>=geometry.left-2,'操作列始终可见');
   assert(await sources.locator('.gd-analysis-sources').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'子表不增加横向滚动');
  }
  if(width===900)await history.screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-inline-evidence.png',import.meta.url))});
 }
 await page.locator('#close').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().historyRows)),baseline,'展开、横滑与缩放均不改变业务历史');
}
