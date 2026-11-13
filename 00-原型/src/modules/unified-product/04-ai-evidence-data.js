// 在生成诊断时保存对应事实与原记录；点击依据时不重新取数。
function upAiEvidenceSnapshot(a,brief){
 const {model:m}=upAiFullContext(a.product),period=a.range.start+' — '+a.range.end,d=a.demo;
 const source=(name,range,content,extra={})=>({name,period:range,content,...extra});
 const metrics=source('产品业绩（原型数据）',period,'累计GSV '+upAiMoney(m.company.gsvCents)+'；页面利润率 '+upPercent(m.company.profitRate)+'；销量 '+formatSalesQuantity(m.company.sales,'件')+'。');
 const recent=source('近期业绩对比（原型数据）',shiftDate(a.range.end,-29)+' — '+a.range.end,'近30日GSV '+upAiMoney(m.recent.gsvCents)+'；前期 '+m.previousStart+' — '+m.previousEnd+'，GSV '+upAiMoney(m.previous.gsvCents)+'。');
 const rating=source('考核月业绩与评级规则（原型数据）',d.rating.start+' — '+d.rating.end,'GSV '+upAiMoney(d.rating.facts.gsvCents)+'；页面利润率 '+upPercent(d.rating.facts.profitRate)+'；规模等级 '+(a.assessment.grade||'未确认')+'。');
 const simulated=key=>source({cost:'成本试算记录',report:'采购日报',meeting:'经营会议',inspection:'品质周报',task:'研发周报'}[key], '原记录未提供日期',d.records[key],{simulated:true,author:'未提供',recordDate:'未提供'});
 const cost=source('成本试算（模拟资料）',d.rating.start+' — '+d.rating.end,'渠道供价 '+fmt(d.cost.channel/100,2)+'元/台；单台降价 '+fmt(d.cost.discount/100,2)+'元；假设降价全额传导、其他成本和销量不变，试算利润率 '+upPercent(d.cost.projectedMargin)+'。',{simulated:true});
 const stock=source('公司库存快照（原型数据）',m.stockEnd||a.range.end,'呆滞库存 '+fmt(m.stock?.staleUnits||0)+'件；呆滞货值 '+upAiMoney(m.stock?.staleValueCents||0)+'；我司可售库存 '+fmt(d.supply.warehouse)+'件。');
 const eventRows=()=>upViolationRows({quality:qrPlatforms.map(platform=>qrObservation(a.product,platform,a.range.start,a.range.end))}).map(e=>({date:e.date,platform:e.platform,type:e.type,amount:e.amount}));
 const sourcesFor=issue=>{
  if(issue.key==='returns')return [source('分平台退货（原型数据）',period,a.rows.filter(r=>r.gap>0).map(r=>r.platform+'：总退 '+upPercent(r.returnRate)+'；目标 '+upPercent(r.target)+'；退货 '+fmt(r.returned)+'件。').join('\n')),simulated('inspection'),simulated('task')];
  if(issue.key==='stock')return [stock,simulated('meeting'),simulated('report')];
  if(issue.key==='violations'){const records=eventRows();return [source('产品违规事件台账（原型数据）',period,'本次范围累计 '+records.length+'条事件；不能据此认定当前仍未处理。',{records})]}
  if(issue.key==='profit')return [metrics,source('分平台利润率（原型数据）',period,a.rows.filter(r=>r.sales>0).map(r=>r.platform+'：GSV '+upAiMoney(r.gsvCents)+'；页面利润率 '+upPercent(r.profitRate)+'。').join('\n')),cost,simulated('report')];
  if(issue.key==='efficiency')return [recent,simulated('report')];
  return [metrics,recent,simulated('meeting')];
 };
 const verdictSources=[metrics,recent,rating];
 if(/降本|成本/.test(a.summary))verdictSources.push(cost,simulated('report'));
 if(a.summary.includes('呆滞'))verdictSources.push(stock);
 if(a.summary.includes('退货')){const issue=a.issues.find(i=>i.key==='returns');if(issue)verdictSources.push(...sourcesFor(issue))}
 const items=[{section:'经营结论',statement:a.summary+brief.context,nature:'分析判断',sources:verdictSources,note:'经营去留与投入取舍为分析建议，不是已审批决定。'}];
 const first=brief.problems.indexOf('。');
 items.push({section:'问题分析',statement:first>=0?brief.problems.slice(0,first+1):brief.problems,nature:'数据与规则判断',sources:[rating]});
 if(brief.problems.includes('渠道供价')){
  const start=brief.problems.indexOf('渠道供价'),end=brief.problems.indexOf('。',start);
  items.push({section:'问题分析',statement:brief.problems.slice(start,end<0?undefined:end+1),nature:'条件试算',sources:[cost,simulated('report')],note:'成本及报价条件属于模拟资料，不能当作真实已生效报价。'});
 }
 for(const issue of a.issues)if(brief.problems.includes(issue.evidence))items.push({section:'问题分析',statement:issue.evidence,nature:'数据或来源陈述',sources:sourcesFor(issue)});
 for(const line of brief.actions.split('\n').filter(Boolean)){
  const issue=a.issues.find(i=>i.action===line);
  items.push({section:'部门行动',statement:line,nature:'分析建议',sources:issue?sourcesFor(issue):[metrics,recent,rating,simulated('meeting')],note:'本次按职责提出的协作建议，不代表已派任务或原记录明确任命；模拟记录未提供作者及责任人。'});
 }
 return {product:{id:String(a.product.spuId),name:a.product.name,code:a.product.spuCode},period,cutoff:a.range.end,generatedAt:new Date().toISOString(),items};
}
