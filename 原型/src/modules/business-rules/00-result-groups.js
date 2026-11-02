// 同一结果的条件共用连接关系；保留原字段键及默认逻辑，兼容已保存配置。
const brcResultGroups=[
 ...['S','A','B','C'].map(level=>({id:'grade-'+level,title:level+'级',keys:[brcGradeKeys(level).sales],op:'all'})),
 ...[['quarter','new.quarterGsv'],['year','new.yearGsv'],['season','new.seasonGsv']].map(([id,key])=>({id:'success-'+id,title:'销售成功',keys:[key,'new.profit','new.return'],op:'all'})),
 {id:'quality-risk',title:'品质风险',keys:['quality.returnDelta','quality.orders','quality.contactDelta'],parts:['quality-return','quality.contactDelta'],relationKey:'quality.contactDelta',addKey:'quality.contactDelta',op:'any'},
 {id:'quality-return',title:'总退风险',keys:['quality.returnDelta','quality.orders'],parent:'quality-risk',op:'all'},
 {id:'quality-worsening',title:'退货恶化',keys:['quality.worsenSales','quality.worsenReturn','quality.worsenReceived'],parts:['quality.worsenSales','quality-worsening-rate'],op:'all'},
 {id:'quality-worsening-rate',title:'退货增长条件',keys:['quality.worsenReturn','quality.worsenReceived'],parent:'quality-worsening',op:'any'},
 {id:'stock-platform',title:'高危库存',keys:['stock.profit','stock.return','stock.received','stock.violations'],op:'any'},
 {id:'stock-stagnant-warning',title:'呆滞预警',keys:['stock.warning.warehouse','stock.warning.netSales','stock.warning.coverageDays'],op:'all'},
 {id:'stock-shortage-warning',title:'缺货预警',keys:['stock.shortage.excluded','stock.shortage.netSales','stock.shortage.sellableDays','stock.shortage.totalDays'],parts:['stock.shortage.excluded','stock.shortage.netSales','stock-shortage-days'],op:'all'},
 {id:'stock-shortage-days',title:'天数条件',keys:['stock.shortage.sellableDays','stock.shortage.totalDays'],parent:'stock-shortage-warning',op:'any'}
];
function brcResultGroup(id){return brcResultGroups.find(group=>group.id===id)}
function brcResultRelationKey(id){const group=brcResultGroup(id);return group.relationKey||group.keys[0]}
function brcResultOp(id,conditions=brcConditions()){const group=brcResultGroup(id);return conditions[brcResultRelationKey(id)]?.groupOp||group.op}
function brcResultMembers(id,conditions=brcConditions()){return brcResultGroup(id).keys.filter(key=>!conditions[key]?.groupSkip)}
function brcResultCondition(id,conditions=brcConditions(),transform=(key,c)=>c){
 const group=brcResultGroup(id),op=brcResultOp(id,conditions);
 const named=(key,c)=>c.conditions?{op:c.op,conditions:c.conditions.map(term=>named(key,term))}:{op:c.op,a:c.a,metric:c.metric||brcMetricConfig(key).default};
 const parts=group.parts||group.keys,terms=parts.flatMap(part=>{
  const nested=brcResultGroup(part);
  if(nested)return brcResultMembers(part,conditions).length?[brcResultCondition(part,conditions,transform)]:[];
  return conditions[part]?.groupSkip?[]:[named(part,transform(part,conditions[part]))];
 });
 return {op:terms.length?op:'any',conditions:terms.flatMap(term=>term.op===op?term.conditions:[term])};
}
// 保存时替换条件对象；按版本对象缓存编译结果，避免逐SKU反复展开规则。
const brcResultMatchCache=new WeakMap();
function brcResultMatch(id,metrics,source=brcConditions()){let cache=brcResultMatchCache.get(source);if(!cache){cache=new Map();brcResultMatchCache.set(source,cache)}if(!cache.has(id))cache.set(id,brcResultCondition(id,source));return brcPredicateTest(cache.get(id),'value',metrics)}
function brcResultText(id,source=brcConditions()){
 const group=brcResultGroup(id),metrics=new Map(group.keys.flatMap(key=>brcMetricConfig(key).choices.map(metric=>[metric.id,metric])));
 // 默认排除状态用业务文案展示，保留布尔条件本身及其他配置的描述。
 const text=c=>c.conditions?brcJoinConditionText(c,text):c.metric==='excluded'&&c.op==='eq'&&c.a===0?'非清仓品、非下架品':(metrics.get(c.metric)?.label||'—')+brcMetricConditionText(metrics.get(c.metric),c);
 return text(brcResultCondition(id,source));
}
function brcResultKeyActive(id,key){return brcResultMembers(id).includes(key)}
function brcResultLeafCount(id,conditions){
 const count=c=>c.conditions?c.conditions.reduce((n,term)=>n+count(term),0):1;
 return brcResultMembers(id,conditions).reduce((n,key)=>n+count(conditions[key]),0);
}
