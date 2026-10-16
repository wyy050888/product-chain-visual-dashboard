// 身份、AI诊断和经营视图；渠道岗位只在店铺信息中按实际适用项展示。
function sdHero(shop){
 const fields=[['店铺ID',shop.shopId],['平台',shop.channel],['品牌',shop.brand],['类目',pfCategory(shop)],['店铺类型',shop.shopCategory],...sdRoles(shop).map(r=>[r.role,r.department+'-'+r.name])];
 return `<header class="up-hero" data-product-summary>${riskThumbnail(shop.name,true)}<div><div class="up-product-heading"><h2>${esc(shop.name)}</h2>${rpPlatformMark(shop.channel)}</div><dl>${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl></div><aside class="sd-hero-scores rp-shop-scores" data-sd-scores aria-label="店铺评分与链接风险"></aside><section class="up-ai-summary" aria-label="店铺AI诊断"></section></header>`;
}
// 只对有依据的风险、相对短板和行动主体着色；数值含义及正文保持不变。
function sdDiagnosisMarkup(value,m,a,actions=false){
 const text=String(value),marks=new Map(),add=(tone,words)=>{for(const word of words)if(word)marks.set(word,tone)};
 const c=m.current,r=m.recent||c,rate=m.recent?m.recent.returnRate:m.returnRate;
 add('decision',['优先处理违规事项','暂缓扩大经营投入','维持经营','先核对经营状态','暂缓无依据的投入扩张']);
 const score=sdScoreFacts(m.shop);
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
 const full=sdAiFullContext(m.shop),a=sdDiagnosis(full.model,full.state),host=root.querySelector('.up-ai-summary');state.aiOpen??=true;
 host.innerHTML=`<div class="up-ai-heading"><strong>AI 诊断</strong><span class="up-ai-scope">截至${a.range.end}</span><div class="up-ai-controls"><button class="link" data-sd-prompt>提示词</button><button class="link" data-sd-ai-toggle aria-expanded="${state.aiOpen}">${state.aiOpen?'收起':'展开'}⌃</button></div></div><div class="up-ai-section up-ai-verdict"><strong>经营结论</strong><p><b>${sdDiagnosisMarkup(a.summary,full.model,a)}</b>${sdDiagnosisMarkup(a.context,full.model,a)}</p></div><div data-sd-ai-content ${state.aiOpen?'':'hidden'}><div class="up-ai-section"><strong>问题分析</strong><p>${a.dimensions.map(([label,text])=>`<span class="sd-diagnosis-dimension"><b>${esc(label)}</b>${sdDiagnosisMarkup(text,full.model,a)}</span>`).join('')}</p></div><div class="up-ai-section up-ai-actions"><strong>部门行动</strong><p>${sdDiagnosisMarkup(a.actions,full.model,a,true)}</p></div></div><dialog class="up-ai-prompt-dialog"><header><h4>${esc(m.shop.channel)}店铺AI诊断提示词</h4><button data-sd-prompt-close aria-label="关闭提示词">×</button></header><pre>${esc(sdPromptFor(m.shop.channel))}</pre></dialog>`;
 host.querySelector('[data-sd-ai-toggle]').onclick=e=>{state.aiOpen=!state.aiOpen;host.querySelector('[data-sd-ai-content]').hidden=!state.aiOpen;e.currentTarget.textContent=state.aiOpen?'收起⌃':'展开⌄';e.currentTarget.setAttribute('aria-expanded',state.aiOpen)};
 const dialog=host.querySelector('dialog');host.querySelector('[data-sd-prompt]').onclick=()=>dialog.showModal();host.querySelector('[data-sd-prompt-close]').onclick=()=>dialog.close();
}
function sdOperating(m,state){
 const c=m.current;
 const metrics=[['GSV',pfMoneyYuan(c.gsv),c.gsv,m.previous.gsv],['去退后销量',fmt(c.netSales),c.netSales,m.previous.netSales],['总退',upPercent(m.returnRate),m.returnRate,m.previousReturnRate]];
 const chart=upSalesTrend([], {rows:sdTrendRows(sdTrendPoints(m,state),state.period?.mode),title:'店铺业绩趋势',bottom:300,tick:r=>state.period?.mode==='year'?r.date.slice(0,7):r.date.slice(5,10),series:[{key:'gsv',name:'GSV',unit:'万元',color:'#1677ff',axis:64,anchor:'end'},{key:'netSales',name:'去退后销量',unit:'件',color:'#e49b37'},{key:'returnRate',name:'总退',unit:'%',color:'#ed6178'}]});
 return `<div class="sd-operating-overview"><div class="sd-kpis">${metrics.map(([label,value,now,before])=>`<div class="up-metric"><small>${label}</small><div class="up-operating-value"><strong>${esc(value)}</strong><span class="${rpQualityChangeTone(now,before)}">${esc(rpQualityChange(now,before))}</span></div></div>`).join('')}</div>${chart}</div><h3>店铺产品SPU业绩</h3><div class="up-table" data-sd-spu-table></div><div data-sd-spu-pages></div>`;
}
function sdMountProducts(root,m){
 upMountTable(root.querySelector('[data-sd-spu-table]'),root.querySelector('[data-sd-spu-pages]'),['SPU信息','GSV','去退后销量','利润率'],m.products.map(r=>[
  `<div class="sd-spu-identity">${riskThumbnail(r.product.name)}<div><span>${esc(r.product.name)}</span><small>SPU码：${esc(r.product.spuCode)}</small></div></div>`,upMoney(r.gsvCents),fmt(r.netSales),upPercent(r.profitRate)
 ]));
}
