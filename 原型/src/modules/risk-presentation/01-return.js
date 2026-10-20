// 退货恶化榜复用经营台账和品质处罚事件；展示调整不改变入榜规则。
const rpReturnCardKeys=['gsv','netSales','margin','return','received'];
const rpReturnListKeys=['gsv','sales',...rpReturnCardKeys.slice(1),'season','productType'];
function rpReturnFields(record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=record.channel;
 const observed=qrObservation(upProduct(product),platform,w.start,w.end);
 const events=rpQualitySelectEvents(observed.monthly,true);
 const earlier=rpQualityEvents({...record,platform},previous.start,previous.end,true),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>fields.push({...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone});
 const compareHint='环比取紧邻等长区间；上涨绿色，跌幅≤10%灰色，跌幅>10%红色。';
 for(const [key,name,now,before] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','去退后销量',current.sales-current.returned,previous.sales-previous.returned]])
  add(key,name,key==='gsv'?rpQualityMoney(now/100):fmt(now),now,'rp-quality-normal',rpQualityChange(now,before),rpQualityChangeTone(now,before),(key==='netSales'?'同期销量减总退件数。':'')+compareHint);
 const margin=rpLossMarginComparison(current.profitRate,previous.profitRate);
 add('margin','利润率',upPercent(current.profitRate),current.profitRate,'rp-quality-normal',margin.target,margin.targetTone,'所选期间利润额÷GSV；负利润率环比以上期绝对值为分母。'+compareHint);
 for(const [key,name,actual,goal] of [['return','总退',current.returnRate,observed.monthly.target],['received','已收退',current.receivedRate,8]]){
  const rule=rpQualityReturnRule(actual,goal);
  add(key,name,upPercent(actual),actual,rule.tone,rule.target,rule.targetTone,'偏差＝实际－目标；目标 '+upPercent(goal)+'，正偏差小于目标×5%黄色，达到或超过红色；负偏差绿色、主值正常色。已收退沿用8%演示目标。');
 }
 for(const [key,name,type] of [['fine','平台罚款','罚款'],['frozen','资金冻结','资金冻结']]){
  const list=events.filter(e=>e.type===type),amount=list.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  add(key,name,rpQualityMoney(amount),amount,rpQualityAmountTone(amount),list.length+'次','rp-quality-gray','所选期间品质原因'+name+'事件金额与次数；冻结事件金额不作为实时余额。');
 }
 const count=events.filter(e=>e.type==='下架').length,before=earlier.filter(e=>e.type==='下架').length;
 add('offShelf','链接下架',count+'次',count,'rp-quality-normal',rpQualityChange(count,before),rpQualityChangeTone(count,before),'所选期间品质原因下架次数，不合并掉权。'+compareHint);
 return [...fields,...rpQualityProductFields(record)].map(field=>rpViolationField(field,platform));
}
function rpReturnCardColumns(){return '<div class="rp-quality-columns rp-return-columns">'+['GSV','去退后销量','利润率','总退','已收退'].map(name=>'<span>'+name+'</span>').join('')+'</div>'}
function rpReturnCardEntry(record,index){return rpProductCardEntry(6,record,index,rpReturnCardKeys,'rp-return')}
