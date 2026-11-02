// 摘要与待办共用全平台事实；净利润估算不用于评级或直接触发下市。
function upAiAnalysis(m,state){
 const full=upAiFullContext(m.product);m=full.model;state=full.state;
 const s=m.company,previous=m.previous;
 const rows=m.platformRows.map(r=>{const target=rpLossReturnTarget(m.product,r.platform,state.start,state.end);return {...r,target,gap:Number.isFinite(r.returnRate)&&Number.isFinite(target)?r.returnRate-target:null}});
 const active=rows.filter(r=>r.sales>0),demo=upAiDemoContext(m,state),assessment=upAiAssessment(m,state,demo),issues=[];
 const add=(key,title,evidence,impact,owner)=>issues.push({key,title,evidence,impact,owner,action:'',watch:'页面利润率、用户反馈和供需缺口'});
 const lossRows=active.filter(r=>Number.isFinite(r.profitRate)&&r.profitRate<0).sort((a,b)=>a.profitCents-b.profitCents);
 const profitNeed=lossRows.length||s.profitRate<0||['A','C'].includes(assessment.grade)&&brcProductOperatingMatch(assessment.grade,s.profitRate);
 if(profitNeed)add('profit',s.profitRate<0?'页面利润率为负，需比较改善与退出方案':'需核实利润缺口及渠道成本改善条件',
  '累计页面利润率'+upPercent(s.profitRate)+'；'+(lossRows.length?lossRows.map(r=>r.platform).join('、')+'页面利润率为负。':'当前利润表现需核实成本改善空间。'),
  '渠道成本等于渠道供价；演示成本档案及采购日报支持比较降本条件，估算净利润不参与评级。','产品中心、采购部');
 const returns=active.filter(r=>r.gap>1e-10).sort((a,b)=>b.returned-a.returned);
 if(returns.length){const r=returns[0];add('returns','定位'+r.platform+'退货原因及影响SKU',
  r.platform+'总退'+upPercent(r.returnRate)+'，高于目标'+fmt(r.gap,1)+'%；退货'+fmt(r.returned)+'件。',
  '总退偏高不能直接证明设计缺陷或供应商责任；演示品质周报尚未复现一致性技术异常，应结合订单及使用反馈完成原因验证。','品质中心、用户中心');}
 const events=upViolationRows({quality:qrPlatforms.map(platform=>qrObservation(m.product,platform,state.start,state.end))});
 if(events.length)add('violations','逐单核对违规原因及处理状态','历史累计'+events.length+'条违规记录，当前影响按处理状态核验。',
  '期间记录不代表当前仍未处理；冻结事件金额不等于实时冻结余额，须按实际记录核对。','产品中心');
 if(m.stock?.staleUnits>0)add('stock','核对呆滞SKU及采购排产安排',
  '截至'+(m.stockEnd||state.end)+'，呆滞库存'+fmt(m.stock.staleUnits)+'件、货值'+upAiMoney(m.stock.staleValueCents)+'。',
  '库存为公司快照；请购、采购、排产及在途不能重复计量，演示采购单与排产已关联，变更须按会议确定的需求与供应商条件执行。','计划部、采购部');
 const growth=rpQualityChangeValue(m.recent.gsvCents,previous.gsvCents);
 if(!profitNeed&&growth!==null&&growth<0)add('efficiency','核实需求与产品价值变化','近30日GSV'+rpComparisonText(growth)+'。',
  '销售下降不能直接证明产品失去竞争力，应结合季节、用户反馈及供货记录判断。','产品中心');
 if(!issues.length)add('review',active.length?'验证产品价值及备货条件':'核对在售状态与数据完整性',
  active.length?'页面利润率'+upPercent(s.profitRate)+'，演示工作记录支持先验证成本及使用指引改善。':'所选期间无有效销量。',
  '汇报演示单据、报价和工作记录统一标识为模拟资料，不作为真实业务凭证。','产品中心');
 const direction={hasSales:active.length>0,overallLoss:Number.isFinite(s.profitRate)&&s.profitRate<0,hasLoss:lossRows.length>0,
  hasReturns:returns.length>0,hasStock:m.stock?.staleUnits>0,growth,season:m.product.attribute,isNew:m.product.cohort==='new'};
 const analysis={product:m.product,range:{start:state.start,end:state.end},months:m.months,recent:m.recent,demo,assessment,direction,issues,rows,gsv:upAiMoney(s.gsvCents),margin:upPercent(s.profitRate),growth:rpComparisonText(growth)};
 const actions=upAiActionText(analysis);for(const issue of issues)issue.action=actions[issue.key];
 analysis.activeTasks=Object.values(upTodos).filter(t=>t.spuId===m.product.spuId&&!t.deletedAt&&t.status!=='done');
 analysis.summary=upAiProductVerdict(analysis);
 return analysis;
}
function upAiMoney(cents){return upMoney(cents).replace('w','万元')}
function upAiProductVerdict(a){
 const d=a.direction,g=a.assessment.grade;
 if(!d.hasSales)return '有效数据不足，暂不判断产品去留，新增投入须补充依据。';
 if(d.overallLoss)return a.demo.cost.projectedMargin<0?'现有降本试算仍不能恢复盈利，建议控制新增采购并比较整改与退出成本。':'建议有条件推进降本，利润改善验证前控制新增采购。';
 if(g==='C')return '按C级进入淘汰评估，先核实一次挽救记录及3个月改善条件。';
 if(g==='S')return '建议继续经营，优先保障有效供给并核定年度BOM降本及迭代计划。';
 if(g==='A')return '建议继续经营，优先验证渠道成本改善方案，备货按供需缺口决定。';
 if(g==='B')return '建议保留经营，验证需求及售后后再增加备货，升级规则待确认。';
 if(d.hasReturns)return '优先核实退货原因及成本影响，迭代和新增备货以验证结果为依据。';
 if(d.hasStock)return '建议优先处理呆滞库存，按SKU分别核定需求与采购调整。';
 return '可维持现有经营，验证产品价值与供需缺口后再决定新增投入。';
}
function upAiBrief(a){
 const priority=['profit','returns','stock','violations','efficiency','review'];
 const focus=[...a.issues].sort((x,y)=>priority.indexOf(x.key)-priority.indexOf(y.key)).slice(0,3),g=a.assessment;
 const rated=g.facts||{gsvCents:0,profitRate:null};
 const context='累计GSV '+a.gsv+'，累计页面利润率'+a.margin+'；近30日GSV'+a.growth+'。';
 const rating=g.grade?(g.month+'月GSV '+upAiMoney(rated.gsvCents)+'、页面利润率'+upPercent(rated.profitRate)+'，'+(rated.profitRate<0?'仅按门槛命中'+g.grade+'级，但处于亏损状态，不能视为经营健康。':'匹配'+g.grade+'级。')):g.note+'。';
 const actions=upAiActionText(a),brief={context,problems:rating,actions:[...focus.map(i=>actions[i.key]),upAiFollowup(a)].join('\n')};
 const size=()=>a.summary.length+Object.values(brief).join('').length;
 const cost=a.demo.cost,condition=a.demo.supply.extra?'附加采购'+fmt(a.demo.supply.offerQty)+'台':'无追加采购条件';
 const economics='渠道供价'+fmt(cost.channel/100,2)+'元/台，降价传导后试算利润率'+upPercent(cost.projectedMargin)+'，'+condition+'。';
 if(cost.channel>0&&size()+economics.length<=600)brief.problems+=economics;
 for(const issue of focus)if(size()+issue.evidence.length<=600)brief.problems+=issue.evidence;
 const execution=a.activeTasks.length?'当前在办'+a.activeTasks.length+'项，整改、供货与退出决策应结合执行进展。':'';
 if(execution&&size()+execution.length<=600)brief.problems+=execution;
 if(!brief.problems)brief.problems='关键原因及方案经济性尚待相关明细与工作记录验证。';
 return brief;
}
