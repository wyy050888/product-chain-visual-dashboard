import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const terms=vm.runInNewContext(fs.readFileSync(new URL('../../src/modules/page-presentation/03-terminology.js',import.meta.url),'utf8').split('function formatDisplayedTerms')[0]+'\npresentationTermText');
const comparable=text=>terms(text.replace(/\b20(\d{2})-(\d{2})-(\d{2})\b/g,'$1/$2/$3')).replace(/\s+/g,'');

function verifyReportHistory(){
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const box=vm.createContext({document:{addEventListener(){}},esc:escape,gdReadableMarkup:escape,gdProblemText:row=>row.problem||'',gdSourceDate:value=>String(value||'').slice(0,10).replace(/^(?:20)?(\d{2})-(\d{2})-(\d{2})$/,'$1/$2/$3'),gdAnalysisSourceTable:sources=>'<table>'+sources.map(s=>'<tr><td>'+escape(s.sourceName)+'</td><td>'+escape(s.content)+'</td></tr>').join('')+'</table>'});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/ai-result-history/02-global.js',import.meta.url),'utf8'),box);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/04-analysis-tables.js',import.meta.url),'utf8'),box);
 const row={id:'r',kind:'report-analysis',historyKey:'report|r',firstDetectedAt:'2026-11-05',problem:'旧判断',sources:[{sourceName:'原报告',date:'2026-11-04',content:'旧时点完整原文，保留抓取及业务日期'}]};
 const updated={...row,problem:'新判断',sources:[{sourceName:'更正报告',date:'2026-11-06',content:'新时点完整原文，不能覆盖旧原文'}]};
 const version=(date,item)=>({date,knownAt:date,payload:{work:[],deviations:[],reports:[item],findingStates:{}}});
 box.aiHistoryStream=()=>({revisions:[version('2026-11-05',row),version('2026-11-06',updated)]});
 const snapshot=JSON.stringify([row,updated]),html=box.gdHistoryEvidence(updated);
 assert.equal(JSON.stringify([row,updated]),snapshot,'排版不改写核对记录或证据');
 assert.equal((html.match(/class="gd-first-diagnosis"/g)||[]).length,1);
 assert(html.indexOf('data-gd-report-follow-record="1"')<html.indexOf('data-gd-report-follow-record="0"'),'新核对在上');
 const newest=html.slice(html.indexOf('id="gd-report-follow-evidence-1"'),html.indexOf('data-gd-report-follow-record="0"'));
 assert(newest.includes(updated.sources[0].content));assert(!newest.includes(row.sources[0].content),'本次依据不借用其他核对记录');
 assert(html.includes(row.sources[0].content),'旧核对保留原始证据');
 const fallback=box.gdHistoryEvidence({...row,historyKey:undefined,firstDetectedAt:undefined,date:'2026-11-04'});
 assert(fallback.includes('未记录'),'工作日期不能冒充核对日期');assert(fallback.includes(row.sources[0].content),'没有历史也不丢本次来源');
 const structured={...row,findings:[{problem:'首条问题'},{problem:'第二条问题'}]},changed={...structured,findings:[{problem:'更正后的问题'}]};
 box.aiHistoryStream=()=>({revisions:[version('2026-11-05',structured),version('2026-11-06',changed)]});
 const aligned=box.gdHistoryEvidence(changed);
 assert(aligned.includes(box.gdReportFindingsContent(structured))&&aligned.includes(box.gdReportFindingsContent(changed)),'核对记录使用当次逐条诊断，不混入摘要');
 assert(!aligned.includes('旧判断'),'已有逐条诊断时不读另一份摘要');
 assert.equal((aligned.match(/data-gd-report-follow-record=/g)||[]).length,2,'仅逐条问题变更也保存核对记录');
}

// 保留原检查入口名称，现验证报告诊断单页及行内来源展开。
export async function reportTabs(page){
 verifyReportHistory();
 const root=page.locator('#ai'),body=page.locator('#dialogbody'),nav=page.locator('#drawer-tabs');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const initial=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports)),stored=await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1'));
 for(const type of ['日报','周报','月报']){
  await page.setViewportSize({width:1920,height:1000});await root.locator('[data-gd-report-type="'+type+'"]').click();
  const visible=await page.evaluate(()=>globalDiagnosisAudit().visible);
  if(!visible.length){assert.equal(await root.locator('[data-report-row]').count(),0);continue}
  const row=root.locator('[data-report-row]').first(),id=await row.getAttribute('data-report-row'),original=visible.find(r=>r.id===id);
  const listState=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().state));
  await row.locator('td:last-child button').click();
  const dialog=page.locator('.gd-report-dialog'),report=dialog.locator('[data-gd-report-pane="report"]'),history=dialog.locator('[data-gd-report-pane="sources"]');
  assert.equal(await nav.locator('[data-drawer-tab]').count(),0,'报告抽屉取消Tab');
  assert(await report.isVisible());assert(await history.isVisible());
  assert.deepEqual(await dialog.locator('h5').allTextContents(),['问题诊断','来源依据与跟进']);
  assert.deepEqual(await history.locator(':scope > .gd-follow-table-wrap > table > thead th').allTextContents(),['核对日期','本次问题与判断','处理情况','操作']);
  assert.equal(await history.locator('.gd-first-diagnosis').count(),1);
  assert.equal(await history.locator('[data-gd-follow-status], [data-follow-state]').count(),0,'报告补正不套业务状态');
  assert.deepEqual(await history.locator('.gd-follow-record').first().locator('[data-label="本次问题与判断"] .gd-report-finding').allTextContents(),await row.locator('[data-label="问题说明"] .gd-report-finding').allTextContents(),'里外问题内容、顺序及分行一致');
  const firstHandling=history.locator('[data-gd-report-follow-record="0"] [data-label="处理情况"]');
  assert.equal(await firstHandling.innerText(),'暂无');assert.equal(await firstHandling.locator('.muted').count(),1,'首次处理情况灰色暂无');
  const button=history.locator('[data-gd-follow-evidence]').first(),detail=history.locator('#'+await button.getAttribute('aria-controls'));
  assert(await detail.isHidden());await button.click();assert(await detail.isVisible());assert.equal(await button.innerText(),'收起依据');
  const sources=detail.locator('table[aria-label="来源与内容"]');
  assert.deepEqual(await sources.locator('thead th').allTextContents(),['来源','内容']);
  const full=await sources.locator('tbody td:last-child').allTextContents();
  for(const source of original.sources)assert(full.some(text=>comparable(text).includes(comparable(source.content))),'完整原文保留在当次依据中');
  assert(await sources.locator('[data-source-type]').count()>0);assert(await sources.locator('[data-source-name]').count()>0);assert(await sources.locator('[data-source-captured]').count()>0);
  const title=await page.locator('#dialogtitle').innerText(),beforeText=await report.textContent();
  for(const width of [1920,1280,390]){
   await page.setViewportSize({width,height:900});
   const scroller=history.locator('[data-gd-follow-scroll]');await scroller.evaluate(el=>el.scrollLeft=el.scrollWidth);
   const bounds=await detail.locator('.gd-follow-evidence-shell').boundingBox(),parent=await scroller.boundingBox();
   assert(Math.abs(bounds.x-parent.x)<2&&bounds.width<=parent.width+1,'子表保持在抽屉可视区内');
   const table=history.locator('.gd-report-follow-table');
   assert(await table.evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.clientWidth-1),'跟进表撑满可用宽度，操作列右侧无留白');
   const record=history.locator('.gd-follow-record').first();
   await record.locator('td').first().hover();
   const hoverColors=await record.locator('td').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).backgroundColor));
   assert(hoverColors.every(color=>color===hoverColors[0])&&hoverColors[0]==='rgb(250, 251, 255)','固定操作列与整行同步显示悬浮背景');
   assert(await sources.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'来源子表自动换行，不叠加横向滚动');
   const scroll=await page.evaluate(()=>scrollY);await body.evaluate(el=>el.scrollTop=el.scrollHeight);assert.equal(await page.evaluate(()=>scrollY),scroll,'正文只在抽屉内滚动');
   assert.equal(await page.locator('.gd-report-dialog').count(),1,'依据不打开第二个抽屉');
  }
  const more=detail.locator('[data-gd-follow-source-more]:visible').first();
  if(await more.count()){await more.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'true');await more.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'false')}
  await button.click();assert(await detail.isHidden());assert.equal(await button.innerText(),'查看依据');
  assert.equal(await page.locator('#dialogtitle').innerText(),title);assert.equal(await report.textContent(),beforeText);
  await page.locator('#close').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().state)),listState,'关闭抽屉保留列表筛选');
 }
 await page.setViewportSize({width:1920,height:1000});await root.locator('[data-gd-tab="missing"]').click();
 assert.deepEqual(await root.locator('.missing th').allTextContents(),['人员 / 部门','报告类型','工作日期','应交时间','是否已补交']);
 assert.equal(await root.locator('.missing [data-gd-action]').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports)),initial,'单页展示不改原报告、判断及来源');
 assert.equal(await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1')),stored,'不回写手工任务');
 console.log('通过：报告诊断单页、四列跟进、首次标签、当次依据、完整原文及横滑窄屏。');
}
