// 业务规则与数据来源边界；本地样例由共用分析模型生成，尚未调用真实AI。
function upAiRulePrompt(){return dashboardAiPrompts.product;}
let upAiSummaryPrompt=upAiRulePrompt();
// 仅标记已确认的风险值和业务关键词；不改正文、不按所有数字统一着色。
function upAiTextMarkup(value,a,actions=false){
 const text=String(value),marks=new Map();
 const add=(tone,words)=>{for(const word of words)if(word)marks.set(word,tone)};
 add('decision',['控制新增采购','提交下市评估','继续经营','优先保障有效供给','进入淘汰评估']);
 add('attention',['评级待确认','升级规则待确认','仅按门槛命中'+(a.assessment.grade||'')+'级']);
 add('risk',['不能恢复盈利','处于亏损状态','页面利润率为负']);
 const rates=[a.assessment.facts?.profitRate,a.demo.cost.projectedMargin,...a.rows.map(r=>r.profitRate)];
 if(a.direction.overallLoss)add('risk',[a.margin]);
 add('risk',rates.filter(n=>Number.isFinite(n)&&n<0).map(upPercent));
 for(const row of a.rows.filter(r=>r.gap>0))add('risk',['总退'+upPercent(row.returnRate),'高于目标'+fmt(row.gap,1)+'%']);
 const stock=a.issues.find(i=>i.key==='stock');
 if(stock)add('attention',[stock.evidence.match(/呆滞库存[\d,]+件/)?.[0]]);
 if(a.demo.supply.extra)add('attention',['附加采购'+fmt(a.demo.supply.offerQty)+'台']);
 if(actions)add('owner',['产品中心','采购部','财务','用户中心','品质中心','研发中心','计划部','发货部','项目部']);
 const tokens=[...marks.keys()].filter(word=>text.includes(word)).sort((x,y)=>y.length-x.length);
 if(!tokens.length)return esc(text);
 const pattern=new RegExp(tokens.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 let html='',cursor=0;
 for(const match of text.matchAll(pattern)){
  html+=esc(text.slice(cursor,match.index))+`<span class="up-ai-mark ${marks.get(match[0])}">${esc(match[0])}</span>`;
  cursor=match.index+match[0].length;
 }
 return html+esc(text.slice(cursor));
}
function upMountAiSummary(root,m,state){
 state.aiSummaryOpen ??= true;
 const host=root.querySelector('.up-ai-summary'),historyKey='product|'+m.product.spuId,expanded=!!state.aiSummaryOpen;
 const saved=aiHistoryCompute(historyKey,DATA_CUTOFF,()=>{const analysis=upAiAnalysis(m,state),brief=upAiBrief(analysis);return {analysis,brief,evidence:upAiEvidenceSnapshot(analysis,brief)}},dashboardAiPrompts.hashes);
 const {analysis,brief}=saved;
 host.innerHTML=`<div class="up-ai-heading"><span class="ai-logo" aria-hidden="true"><b>AI</b></span><strong>AI诊断</strong><span class="up-ai-scope">截至${esc(analysis.range.end)}</span><div class="up-ai-controls"><button type="button" class="link" data-up-ai-evidence aria-haspopup="dialog" aria-expanded="false">查看依据</button><button type="button" class="link" data-up-ai-prompt aria-haspopup="dialog" aria-expanded="false" aria-controls="up-ai-prompt">提示词</button><button type="button" class="link" data-up-ai-toggle aria-expanded="${expanded}" aria-controls="up-ai-details">${expanded?'收起':'展开'} <span aria-hidden="true">${expanded?'⌃':'⌄'}</span></button></div></div>
 <div class="up-ai-section up-ai-verdict"><strong>经营结论</strong><p><b>${upAiTextMarkup(analysis.summary,analysis)}</b>${upAiTextMarkup(brief.context,analysis)}</p></div>
 <div id="up-ai-details" ${expanded?'':'hidden'}><div class="up-ai-section"><strong>问题分析</strong><p>${upAiTextMarkup(brief.problems,analysis)}</p></div><div class="up-ai-section up-ai-actions"><strong>部门行动</strong><p>${upAiTextMarkup(brief.actions,analysis,true)}</p></div></div>
 <dialog id="up-ai-prompt" class="up-ai-prompt-dialog" aria-labelledby="up-ai-prompt-title"><header><h4 id="up-ai-prompt-title">AI诊断提示词</h4><button type="button" data-up-ai-prompt-close aria-label="关闭提示词" autofocus>×</button></header><pre tabindex="0" data-preserve-terms data-date-raw>${esc(upAiSummaryPrompt)}</pre></dialog><dialog class="up-ai-prompt-dialog up-ai-evidence-dialog" data-up-ai-evidence-dialog aria-labelledby="up-ai-evidence-title"><header><h4 id="up-ai-evidence-title">本次诊断依据</h4><button type="button" data-up-ai-evidence-close aria-label="关闭本次依据">×</button></header><div class="up-ai-evidence-body" data-up-ai-evidence-body></div></dialog>`;
 upMountAiEvidence(host,saved,m.product.spuId);
 const toggle=host.querySelector('[data-up-ai-toggle]'),details=host.querySelector('#up-ai-details');
 toggle.onclick=()=>{state.aiSummaryOpen=!state.aiSummaryOpen;details.hidden=!state.aiSummaryOpen;toggle.setAttribute('aria-expanded',String(state.aiSummaryOpen));toggle.innerHTML=state.aiSummaryOpen?'收起 <span aria-hidden="true">⌃</span>':'展开 <span aria-hidden="true">⌄</span>'};
 const button=host.querySelector('[data-up-ai-prompt]'),prompt=host.querySelector('#up-ai-prompt');
 button.onclick=()=>{prompt.showModal();button.setAttribute('aria-expanded','true')};
 prompt.querySelector('[data-up-ai-prompt-close]').onclick=()=>prompt.close();
 prompt.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');if(button.isConnected)button.focus({preventScroll:true})});
 prompt.addEventListener('click',event=>{if(event.target!==prompt)return;const r=prompt.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)prompt.close()});
}

// Escape仅关闭当前提示词弹窗，不冒泡关闭底层产品抽屉。
window.addEventListener('keydown',event=>{
 const prompt=document.querySelector('.up-ai-prompt-dialog[open]');
 if(prompt&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();prompt.close()}
},true);

