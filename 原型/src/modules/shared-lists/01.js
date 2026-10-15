

// Shared reading layout for the director's risk lists; business calculations remain in their owning modules.
const rdActions=[
 ['核对异常订单与处罚凭证，确认影响批次。','品质复测问题批次，运营和客服同步整改。','复核进线、退货及处罚状态，提交证据验收。'],
 ['运营核实扣分、处罚及冻结明细，明确申诉时限。','品质与客服整改异常商品和售后；拼多多逐链接复核。','复核评分、退货与资金状态，全部风险解除后验收。'],
 ['财务核对成本、投放与退货损耗，定位亏损渠道。','采购与运营测算降本、调价方案，审批后执行。','复核单品利润和累计损益，提交改善前后对照。'],
 ['仓储、采购和财务核实库存数量及财务价。','先处理最高优先级风险，再评审调拨、促销或退供。','复核全部命中项、库存及回款，提交凭证验收。'],
 ['核实积压数量、动销及季节销售窗口。','测算渠道调拨或促销收益，审批后分批执行。','按期复核出库、回款和剩余积压，确认处置结果。'],
 ['确认卡点任务、交付条件及责任部门。','协调资源解除卡点，评审恢复上线日期。','逐节点提交交付凭证，项目负责人复核验收。'],
 ['核对两期退货订单，定位增量渠道与异常批次。','品质整改高频问题，客服和仓储跟进未收退订单。','复核总退货率、已收退货率与目标，提交验收。']
];
defaultRiskPlan=function(k,p){return (rdActions[k]||rdActions[0]).map((s,i)=>`${i+1}. ${s}`).join('\n')};
qrPlan=function(o){return `1. 核实${o.platform}异常订单${o.monthly?.penaltyHit?'及处罚凭证，确认申诉时限':'，确认问题批次'}。\n2. 品质复测，运营与客服落实整改及客户处理。\n3. 复核进线环比、退货目标及处罚状态，提交凭证验收。`};

function rdRuleRows(k){return [
 [['进线率','本月产品问题进线数 ÷ 本月销售数','环比增长 ＞20%'],['指标环比','（本月比率 − 上月比率）÷ 上月比率','总退货率、已收退货率、进线率均按此计算；上月为0显示—'],['总退货率','退货件数 ÷ 销售件数','有效订单≥100，且退货率＞总退货率目标+5%'],['已收退货率','已验收入库退货件数 ÷ 同期销售件数','同一产品、平台、月份统计'],['平台处罚风险等级','P1：平台处罚、资金冻结、链接下架、掉权','存在处罚事件即红灯；仅展示实际命中类型'],['其他风险类型','高退货：超过总退货率目标5%且有效订单≥100；高差评：差评率≥8%','高差评为演示标识，不单独触发入榜'],['差评率','差评条数 ÷ 有效评价条数','辅助指标，不单独作为入榜条件']],
 [['天猫核心店铺分','按平台店铺分','≤4.6红灯；4.6＜分数≤4.79黄灯'],['京东核心店铺星级','按平台星级','≤4.5红灯；4.5＜星级≤4.7黄灯'],['抖音旗舰 / 专卖店','按平台星级','≤4.5红灯；4.6＜星级≤4.7黄灯'],['综合风险','月品质处罚 / 品质罚款 / 冻结','≥2次 / ≥5000元 / 有冻结，任一红灯'],['单品退货恶化','连续2周期退货超目标5%','且连续上升，触发红灯'],['拼多多核心20链接','每链接：三级类目、主营类目各3项','六项中≥3项原值＞30%即红灯；等于30%不计入']],
 [['月度亏损金额','本月亏损金额以负数展示，单位万元；按绝对值分级','P1：≥10万元或亏损率≥20%'],['亏损率','亏损绝对值 ÷ 同期销售收入','P2：≥6万元或亏损率≥10%；其余P3']],
 [['高危品库存','仓内 + 工厂 + 在制物料','在制物料取新机未交付数量'],['高危品货值','高危品库存 × 财务价','含税含品牌，按货值降序'],['高危判定','违规红色 / 利润率＜10% / 退货率＞55% / 已收退货率＞30% / 滞销','命中任一项即入榜；按此顺序优先处理'],['平台与等级','六平台分别判断，任一平台命中即触发该项','违规红色P1；比率异常P2；仅滞销P3；等于阈值不触发'],['库存周转率','周期销售成本 ÷ 周期平均库存金额','按所选月 / 季 / 年统计'],['呆滞占比','呆滞库存金额 ÷ 总库存金额','同SPU多风险不重复计库存']],
 [['滞销积压金额','同周期库存台账的呆滞库存金额','单位万元'],['滞销天数','连续低动销天数','P1≥90天；P2为60–89天；P3为30–59天'],['产品属性','夏季品 / 冬季品 / 四季品','独立于月 / 季 / 年筛选；滞销天数不等同库龄']],
 [['延迟天数','截止日 − 原计划上线日期','尚未上线，且超过当前延期预警阈值'],['风险分级','按延迟天数','P1≥30天；P2为15–29天；P3＜15天'],['产品属性','夏季品 / 冬季品 / 四季品','原“季度属性”，不指统计季度']],
 [['总退货率','退货件数 ÷ 发货件数','演示目标≤10%'],['退货率环比','（本期退货率 − 上期退货率）÷ 上期退货率','上期为0不计算增长率'],['已收退货率','已验收入库退货件数 ÷ 发货件数','演示目标≤8%，仍须跟进在途退货'],['已收退 / 环比增长','已验收入库件数 / 较上期增减件数','单位件，区别于增长率'],['销量 / GMV','发货件数 / 退款前发货成交金额','GMV单位万元'],['入榜与分级','退货率≥5%且环比增幅≥10%','P1：退货率≥15%或增幅≥50%；P2：增幅≥25%；其余P3']],
 [['整机储备','按三级类目去重','意向＜5家；准入＜3家；战略＜3家'],['核心物料','美的、海尔、苏泊尔、康佳、创维；电机、电池、电源线、线路板','按品牌×物料准入储备＜5家即红灯'],['引入延期','实际完成或截止日 − 目标完成日','＞10天或影响上线红灯；3–10天黄灯'],['信息 / 星级','必填资料、适用合同 / 动态评级','缺失即预警；评级＜2星预警'],['闭环','提交整改 → 复核达标 → 验收','未通过验收仍保留风险；逾期升级红灯']]
 ][k]||[]}
function rdRules(k){const range=k===0?'本月截至所选结束日，对比上月完整自然月；趋势使用所选日期。':k===6?'本期近30天，对比紧邻的前30天。':k===2?'截止日所在月份。':'采用当前榜单的截止日与统计周期。';return `<div class="rd-rule-content"><div class="rd-rule-scope"><b>统计范围</b><span>${range}</span></div>${table(['指标','怎么算','如何判定'],rdRuleRows(k).map(row=>row.map(esc)))}${k===0?'<p>退货、处罚规则适用抖音、天猫、京东、拼多多；快手、视频号仅启用进线环比规则，其他阈值待配置。</p>':k===1?'<p>多风险取最高等级，资金冻结按金额优先排序；拼多多三项指标为品质退款率、品质求助平台率、品质文本情感分。其他店铺类型不套用上述评分阈值。</p>':''}<p class="rd-rule-demo">演示数据 · 阈值沿用当前看板配置。</p></div>`}
function rdKind(){if($('#dialog').dataset.rdKind!==undefined)return +$('#dialog').dataset.rdKind;if($('#qr-handle-form'))return 0;const title=$('#dialogtitle').textContent;for(const [i,word] of ['品质','店铺','亏损','库存','滞销','延期项目','退货恶化'].entries())if(title.includes(word))return i;if(title.includes('重大风险事项')||title.includes('供应商')&&/预警|风险/.test(title))return 7;return -1}
function rdFold(node,label){if(!node||node.closest('.rd-fold'))return;const fold=document.createElement('details');fold.className='rd-fold';const summary=document.createElement('summary');summary.textContent=label;fold.append(summary);node.before(fold);fold.append(node)}
function rdTable(t){if(t.dataset.rdTable||t.classList.contains('rp-data-table')||t.closest('.up-todo-table'))return;t.dataset.rdTable='true';const hs=[...t.querySelectorAll('thead th')];if(!hs.length)return;t.classList.add('rd-readable-table');const weights=hs.map(h=>/名称|产品 \/|风险事件/.test(h.textContent)?2.1:/风险原因|核心风险|业务影响|轨迹|平台处罚风险等级/.test(h.textContent)?1.8:/主营产品|卡点/.test(h.textContent)?1.5:/序号|缩略图/.test(h.textContent)?.55:1),sum=weights.reduce((a,b)=>a+b,0);hs.forEach((h,i)=>h.style.setProperty('width',(weights[i]/sum*100)+'%','important'));for(const tr of t.querySelectorAll('tbody tr'))[...tr.cells].forEach((td,i)=>{if(hs[i])td.dataset.label=hs[i].textContent});}
function rdDecorate(){
 const dialog=$('#dialog'),body=$('#dialogbody'),title=$('#dialogtitle').textContent,k=rdKind(),list=k>=0&&(/完整榜单|重大风险事项/.test(title)),detail=k>=0&&!list&&(!!body.querySelector('#risk-handle-form,#qr-handle-form,.sd-detail,.project-control-detail,.ir-detail-summary'));
 dialog.classList.toggle('rd-list-dialog',list);dialog.classList.toggle('rd-detail-dialog',detail);if(!list&&!detail)return;
 body.querySelectorAll('table').forEach(rdTable);
 body.querySelectorAll('details.br-rules,details.qr-rules').forEach(d=>{if(d.dataset.rdRules)return;d.dataset.rdRules='true';d.innerHTML='<summary>指标口径与数据说明</summary>'+rdRules(k);d.open=false;d.querySelectorAll('table').forEach(rdTable)});
 const note=body.querySelector('.risk-data-note');if(note&&!note.dataset.rdRules&&!note.querySelector('details')){note.dataset.rdRules='true';const d=document.createElement('details');d.className='br-rules';d.dataset.rdRules='true';d.innerHTML='<summary>指标口径与数据说明</summary>'+rdRules(k);note.replaceWith(d);d.querySelectorAll('table').forEach(rdTable)}
 if(list){body.querySelectorAll('.br-risk-tags').forEach(tags=>{if(tags.dataset.rdCompact)return;tags.dataset.rdCompact='true';const items=[...tags.children];if(items.length>2){const rest=document.createElement('details');rest.className='rd-extra-causes';const summary=document.createElement('summary');summary.textContent='另 '+(items.length-1)+' 项风险';rest.append(summary,...items.slice(1));tags.append(rest)}})}
 if(!detail)return;
 const primary=body.querySelector('.risk-analysis'),anchor=body.querySelector('.risk-context')||body.querySelector('.qr-detail-metrics');if(primary&&anchor&&!primary.dataset.rdPosition){primary.dataset.rdPosition='true';anchor.after(primary)}
 rdFold(body.querySelector('.sd-detail .sc-targets'),'查看类目季度 / 年度目标');
 const links=body.querySelector('.pdd-link-panel');if(links)rdFold(links,'查看'+(links.querySelector('h3')?.textContent||'产品链接异常明细'));

 body.querySelectorAll('.risk-plan-head h3').forEach(h=>{if(h.textContent!=='处理方案 · 三步执行')h.textContent='处理方案 · 三步执行'});
 body.querySelectorAll('#risk-plan,#qr-plan').forEach(t=>{if(t.rows!==4)t.rows=4});
 for(const [selector,label] of [['.ir-detail-summary','查看库存汇总明细'],['.qrb-business','查看业务判定明细 / 配置目标'],['.sb-business','查看店铺风险判定明细'],['.rr-comparison','查看两期数据对照']])rdFold(body.querySelector(selector),label);
 body.querySelectorAll('.risk-ding details[open]').forEach(d=>{if(!d.dataset.rdPreview){d.dataset.rdPreview='true';d.open=false}});
 const analysis=body.querySelector('.risk-analysis');if(analysis&&!analysis.dataset.rdSummary){analysis.dataset.rdSummary='true';const ps=[...analysis.querySelectorAll(':scope > p')];if(ps.length>1){const head=document.createElement('div');head.className='rd-decision';const titles=['风险结论','重点动作'];for(const [i,p] of [ps[0],ps.at(-1)].entries()){const cell=document.createElement('div'),small=document.createElement('small');small.textContent=titles[i];cell.append(small,p.cloneNode(true));head.append(cell)}analysis.querySelector('h3').after(head);const evidence=document.createElement('div');evidence.className='rd-analysis-evidence';ps.forEach(p=>evidence.append(p));analysis.append(evidence);rdFold(evidence,'展开分析依据');}analysis.querySelectorAll(':scope > small').forEach(n=>n.hidden=true)}
}
const rdPreviousModal=openModal;openModal=function(...args){delete $('#dialog').dataset.rdKind;$('#dialog').classList.remove('rd-list-dialog','rd-detail-dialog');return rdPreviousModal(...args)};
// Legacy lists rebuild on filters/pagination. Decorate only new nodes, without replacing controls or handlers.
const rdObserver=new MutationObserver(()=>{rdObserver.disconnect();try{rdDecorate()}finally{rdObserver.observe($('#dialogbody'),{childList:true,subtree:true})}});rdObserver.observe($('#dialogbody'),{childList:true,subtree:true});

// Concise, data-specific director conclusions replace repetitive paragraphs.
const rdPreviousRiskDetail=riskDetail;riskDetail=function(k,id){rdPreviousRiskDetail(k,id);$('#dialog').dataset.rdKind=k;if(k===0||k===5)return;withPeriod('risk',()=>{const p=riskRows(k).find(r=>r.id===+id),a=$('#dialogbody .risk-analysis');if(!p||!a)return;const fact=k===1?`${p.channel} · 店铺分 ${fmt(p.score,2)}；${p.frozenAmount?'冻结 '+fmt(p.frozenAmount)+' 元':p.signals?.[0]?.label||p.risks?.[0]||'命中店铺风险规则'}`:k===2?`本月亏损 ${brLossAmount(p.loss)} 万元，亏损率 ${fmt(p.lossRate,1)}%。`:k===3?`高危货值 ${pfMoneyYuan((p.amount)*10000)}；首要风险：${irReasonText(p.reasons[0])}。`:k===4?`连续低动销 ${p.days} 天，积压 ${pfMoneyYuan((p.amount)*10000)}。`:`${p.channel}退货率 ${fmt(p.returnRate,1)}%，环比 ${rrSigned(p.growth,1,'%')}。`;
 const effect=['','影响店铺流量、回款与经营稳定性。','持续侵蚀单品收益，需确认止损方案。','占用库存资金，需按风险优先级处置。','积压占用资金，需结合季节窗口消化。','','退货成本及收退压力增加，需核实异常批次。'][k];
 a.innerHTML=`<h3>✧ AI 决策摘要</h3><div class="rd-decision">${[['风险信号',fact],['经营影响',effect],['优先动作',rdActions[k][1]]].map(([h,p])=>`<div><small>${h}</small><p>${esc(p)}</p></div>`).join('')}</div>`;a.dataset.rdSummary='true';if(k===4){const dl=$('.sr-evidence dl');if(dl)rdFold(dl,'查看滞销判定依据')}
 });};
qrAnalysis=function(o){const m=o.monthly;return m.risks.length?`${o.platform}命中 ${m.risks.join('、')}。${m.penaltyHit?'优先核对处罚与申诉时限。':'优先核查异常订单与问题批次。'}由品质、运营及客服协同处理，按目标复核验收。`:'当前平台未命中已配置预警规则，保持监测。'};

// The director supplier ranking remains complete and paginated instead of rendering hundreds of rows.
const rdPreviousMajor=svMajor;svMajor=function(){if(svState.context!=='director')return rdPreviousMajor();const rows=svScoped().filter(r=>!r.closed&&r.level==='高危');let page=1;openModal('供应商高危预警 · 完整榜单','<div class="rd-supplier-total"></div><div id="rd-supplier-table"></div><div id="rd-supplier-pages"></div><details class="br-rules"><summary>指标口径与数据说明</summary></details>',false,periodLabel(svContextPeriod()));const fill=()=>{const pages=Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE));$('#dialogbody .rd-supplier-total').textContent=`共 ${rows.length} 项高危风险 · 逾期优先`;$('#rd-supplier-table').innerHTML=dpTable(['风险事件 / 触发条件','业务影响','责任部门 / 采购','发生日期','整改期限','当前状态','最近跟进 / 责任轨迹','操作'],rows.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE).map(r=>{const t=pbTask(r);return[esc(r.name)+'<small>'+esc(r.rule)+'</small>',esc(svAI(r).impact),'采购部 / '+r.owner,r.date,t?.due||'待下发',r.state,esc(t?.logs.at(-1)?.action||'尚未下发')+'<small>'+esc(t?.logs.at(-1)?.actor||r.owner)+'</small>',svButton('查看详情','detail',r.key)]}));mountListPager($('#rd-supplier-pages'),rows.length,page,next=>{page=next;fill()});};fill()};

// Quantity checks use independent project, category and brand/material scopes.
function sqCategory(p){const leaf=[['扫地机器人','洗地机'],['破壁机','空气炸锅'],['循环扇','暖风机'],['剃须刀','吹风机']][p.chain].find(n=>p.name.includes(n));return leaf?scPaths[p.chain].find(path=>path.endsWith('/'+leaf)):chains[p.chain]+'/'+p.name;}
function sqUsesMaterial(p,material){if(material==='电池')return /扫地|洗地|无线|手持|剃须|牙刷|按摩|筋膜/.test(p.name);if(material==='电机')return /扫地|洗地|吸尘|除螨|破壁|料理|风|净化|剃须|牙刷|按摩|筋膜/.test(p.name);return true;}
function sqProjectCell(r,plain=false){const ps=r.relatedProjects||projects().filter(p=>p.id===r.projectId);if(!ps.length)return plain?'未关联项目':'<span class="sc-muted">未关联项目</span>';if(plain)return ps.map(p=>p.name+' / '+p.model).join('；');const p=ps[0];return `<div class="sw-project">${riskThumbnail(p.name)}<div><span>${esc(p.name)}</span><small>${esc(p.model)}</small>${ps.length>1?`<small>等 ${ps.length} 个项目</small>`:''}</div></div>`;}
const sqOriginalQuantity=scQuantityObservations;
