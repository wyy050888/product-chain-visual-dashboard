// 身份、AI诊断和经营视图；渠道岗位只在店铺信息中按实际适用项展示。
function sdHero(shop){
 const fields=[['店铺ID',shop.shopId],['品牌',shop.brand],['店铺类型',shop.shopCategory],...sdRoles(shop).map(r=>[r.role,r.department+'-'+r.name])];
 return `<header class="up-hero" data-product-summary>${riskThumbnail(shop.name,true)}<div><div class="up-product-heading"><h2>${esc(shop.name)}</h2>${rpPlatformMark(shop.channel)}</div><dl>${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd ${k==='店铺类型'?'data-sd-category':''}>${esc(v||'—')}</dd></div>`).join('')}</dl></div><aside class="sd-hero-scores rp-shop-scores" data-sd-scores aria-label="店铺评分与链接风险"></aside><section class="up-ai-summary" aria-label="店铺AI诊断"></section></header>`;
}
// 只对有依据的风险、相对短板和行动主体着色；数值含义及正文保持不变。
function sdDiagnosisMarkup(value,m,a,actions=false){
 const text=String(value),marks=new Map(),add=(tone,words)=>{for(const word of words)if(word)marks.set(word,tone)};
 const c=m.current,r=m.recent||c,rate=m.recent?m.recent.returnRate:m.returnRate;
 add('decision',['优先处理违规事项','暂缓扩大经营投入','维持经营','先核对经营状态','暂缓无依据的投入扩张','优先复核核心链接异常']);
 const score=sdScoreFacts(m.shop);
 if(m.shop.channel==='拼多多'){const links=sdPddAssessment(m.shop,a.range.end);if(links.red)add('risk',[links.red+'条红灯链接']);if(links.yellow)add('attention',[links.yellow+'条黄灯链接']);if(links.unknown)add('attention',[links.unknown+'条待补数据链接'])}
 if(score.low)add('risk',['店铺分'+fmt(m.shop.score,2)]);
 for(const [label,key] of [['商品分','productScore'],['物流分','logisticsScore'],['服务分','serviceScore']])if(score.weakest.split('、').includes(label))add('attention',[label+fmt(m.shop[key],2)]);
 if(c.fine>0)add('risk',['罚款'+pfMoneyYuan(c.fine)]);
 if(c.frozen>0)add('attention',['冻结事件金额'+pfMoneyYuan(c.frozen)]);
 if(Number.isFinite(rate)&&Number.isFinite(m.previousReturnRate)&&rate>m.previousReturnRate)add('risk',['总退由'+upPercent(m.previousReturnRate)+'升至'+upPercent(rate)]);
 if(Number.isFinite(m.previous.netSales)&&r.netSales<m.previous.netSales)add('risk',['去退后销量'+rpQualityChange(r.netSales,m.previous.netSales)]);
 if(actions)add('owner',[a.owner,'品质中心','发货部','用户中心']);
 const words=[...marks.keys()].filter(word=>text.includes(word)).sort((x,y)=>y.length-x.length);if(!words.length)return esc(text);
 const pattern=new RegExp(words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');let html='',cursor=0;
 for(const match of text.matchAll(pattern)){html+=esc(text.slice(cursor,match.index))+`<span class="up-ai-mark ${marks.get(match[0])}">${esc(match[0])}</span>`;cursor=match.index+match[0].length}
 return html+esc(text.slice(cursor));
}
function sdMountDiagnosis(root,m,state){
 const host=root.querySelector('.up-ai-summary');state.aiOpen??=true;
 const historyKey='shop|'+m.shop.channel+'|'+m.shop.shopId;
 const saved=aiHistoryCompute(historyKey,DATA_CUTOFF,()=>{const full=sdAiFullContext(m.shop);const analysis=sdDiagnosis(full.model,full.state);return {model:full.model,analysis,evidence:sdEvidenceSnapshot(full.model,analysis)}},dashboardAiPrompts.hashes),a=saved.analysis,full={model:saved.model};
 host.innerHTML=`<div class="up-ai-heading"><span class="ai-logo" aria-hidden="true"><b>AI</b></span><strong>AI诊断</strong><span class="up-ai-scope">截至${a.range.end}</span><div class="up-ai-controls"><button class="link" data-up-ai-evidence aria-expanded="false">查看依据</button><button class="link" data-sd-prompt>提示词</button><button class="link" data-sd-ai-toggle aria-expanded="${state.aiOpen}">${state.aiOpen?'收起':'展开'}⌃</button></div></div><div class="up-ai-section up-ai-verdict"><strong>经营结论</strong><p><b>${sdDiagnosisMarkup(a.summary,full.model,a)}</b>${sdDiagnosisMarkup(a.context,full.model,a)}</p></div><div data-sd-ai-content ${state.aiOpen?'':'hidden'}><div class="up-ai-section"><strong>问题分析</strong><p>${a.dimensions.map(([label,text])=>`<span class="sd-diagnosis-dimension"><b>${esc(label)}</b>${sdDiagnosisMarkup(text,full.model,a)}</span>`).join('')}</p></div><div class="up-ai-section up-ai-actions"><strong>部门行动</strong><p>${sdDiagnosisMarkup(a.actions,full.model,a,true)}</p></div></div><dialog class="up-ai-prompt-dialog"><header><h4>${esc(m.shop.channel)}店铺AI诊断提示词</h4><button data-sd-prompt-close aria-label="关闭提示词">×</button></header><pre data-preserve-terms data-date-raw>${esc(sdPromptFor(m.shop.channel))}</pre></dialog><dialog class="up-ai-prompt-dialog up-ai-evidence-dialog" data-up-ai-evidence-dialog><header><h4>本次诊断依据</h4><button type="button" data-up-ai-evidence-close aria-label="关闭本次依据">×</button></header><div class="up-ai-evidence-body" data-up-ai-evidence-body></div></dialog>`;
 upMountAiEvidence(host,saved,m.shop.channel+'|'+m.shop.shopId);
 host.querySelector('[data-sd-ai-toggle]').onclick=e=>{state.aiOpen=!state.aiOpen;host.querySelector('[data-sd-ai-content]').hidden=!state.aiOpen;e.currentTarget.textContent=state.aiOpen?'收起⌃':'展开⌄';e.currentTarget.setAttribute('aria-expanded',state.aiOpen)};
 const dialog=host.querySelector('dialog');host.querySelector('[data-sd-prompt]').onclick=()=>dialog.showModal();host.querySelector('[data-sd-prompt-close]').onclick=()=>dialog.close();
}
function sdOperating(m,state){
 const c=m.current;
 const metrics=[['gsv','GSV',pfMoneyYuan(c.gsv),c.gsv,m.previous.gsv],['netSales','销量',formatSalesQuantity(c.netSales),c.netSales,m.previous.netSales]];
 const chart=upSalesTrend([], {rows:sdTrendRows(sdTrendPoints(m,state),state.period?.mode),title:'店铺业绩趋势',bottom:186,tick:r=>state.period?.mode==='year'?r.date.slice(0,7):r.date.slice(5,10),series:[{key:'gsv',name:'GSV',unit:'万元',color:'#1677ff',axis:'left'},{key:'netSales',name:'销量',unit:'件',color:'#fa803b',axis:'right'}]});
 return `<div class="sd-operating-overview"><div class="sd-kpis">${metrics.map(([key,label,value,now,before])=>`<div class="up-metric"><small>${netSalesLabel(label,key)}</small><div class="up-operating-value"><strong>${esc(value)}</strong><span class="${rpQualityChangeTone(now,before)}">${esc(rpQualityChange(now,before))}</span></div></div>`).join('')}</div>${chart}</div><h3>店铺产品SPU业绩</h3><div class="up-table" data-sd-spu-table></div><div data-sd-spu-pages></div>`;
}
// 先对全量SPU按原值排序，再分页；换期间保留排序方向，页码回到第一页。
function sdMountProducts(root,m,state){
 const host=root.querySelector('[data-sd-spu-table]'),pager=root.querySelector('[data-sd-spu-pages]');
 const columns=[['gsvCents','GSV',row=>upMoney(row.gsvCents)],['netSales','销量',row=>formatSalesQuantity(row.netSales)],['returnRate','总退',row=>upPercent(row.returnRate)],['profitRate','利润率',row=>upPercent(row.profitRate)]];
 const defaultSort={key:'gsvCents',direction:'desc'};state.productSort||={...defaultSort};let page=1;
 const fill=()=>{
  const scroll=host.scrollLeft,sort=state.productSort,rows=rpSortRows(m.products,sort,(row,key)=>row[key]);
  const headers=['SPU信息',...columns.map(([key,label])=>rpSortHeader(key,label,sort,undefined,defaultSort))];
  host.innerHTML=rows.length?table(headers,rows.slice((page-1)*listPageSize(pager),page*listPageSize(pager)).map(row=>[
   `<div class="sd-spu-identity">${riskThumbnail(row.product.name)}<div><span>${esc(row.product.name)}</span><small>SPU码：${esc(row.product.spuCode)}</small></div></div>`,...columns.map(([, ,format])=>format(row))
  ])):'<div class="up-empty">暂无数据</div>';
  rpApplySortAria(host,sort);host.scrollLeft=scroll;
  mountListPager(pager,rows.length,page,next=>{page=next;fill()});
 };
 host.onclick=e=>{const button=e.target.closest('[data-rp-sort]');if(!button)return;const key=button.dataset.rpSort;rpSortCycle(state.productSort,key,defaultSort);page=1;fill();host.querySelector('[data-rp-sort="'+key+'"]').focus({preventScroll:true})};fill();
}
