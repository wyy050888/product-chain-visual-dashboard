import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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

export function reportTabs(){
 verifyReportHistory();
}
