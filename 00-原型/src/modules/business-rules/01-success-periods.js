// 成功条件按完整考核期取值；季度与年度各自保存生效边界，不改变出池等参数。
function brcSuccessKeys(kind){return [kind==='year'?'new.yearGsv':'new.quarterGsv','new.seasonGsv','new.profit','new.return']}
function brcSuccessCopy(conditions){return Object.fromEntries([...new Set([...brcSuccessKeys('quarter'),...brcSuccessKeys('year')])].map(key=>[key,brcCloneCondition(conditions[key])]))}
function brcSuccessCurrent(){
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),year=date.slice(0,4);
 return {quarter:year+'-Q'+Math.ceil(Number(date.slice(5,7))/3),year};
}
function brcSuccessPeriodValid(kind,value){return kind==='year'?/^[1-9]\d{3}$/.test(value):/^[1-9]\d{3}-Q[1-4]$/.test(value)}
function brcSuccessReadTimeline(raw,conditions,values){
 if(!raw)return {
  baseline:brcSuccessCopy(conditions),
  quarter:[{from:brcSuccessStart('quarter'),conditions:brcSuccessCopy(conditions)}],
  year:[{from:brcSuccessStart('year'),conditions:brcSuccessCopy(conditions)}]
 };
 const copy=source=>{
  if(!source||Object.keys(brcSuccessCopy(conditions)).some(key=>!source[key]))throw Error('成功条件记录缺失');
  const result=brcSuccessCopy(source),merged={...conditions,...result};
  if(brcValidate(brcProjectValues(values,merged),merged))throw Error('成功条件记录无效');return result;
 };
 const timeline={baseline:copy(raw.baseline)};
 for(const kind of ['quarter','year']){
  if(!Array.isArray(raw[kind]))throw Error('成功条件生效期间缺失');
  const seen=new Set();timeline[kind]=raw[kind].map(item=>{
   if(!brcSuccessPeriodValid(kind,item.from)||seen.has(item.from))throw Error('成功条件生效期间无效');
   seen.add(item.from);return {from:item.from,conditions:copy(item.conditions)};
  }).sort((a,b)=>a.from.localeCompare(b.from));
 }
 return timeline;
}
function brcSuccessConditions(annual,date){
 const kind=annual?'year':'quarter',from=date?date.slice(0,4)+(annual?'':'-Q'+Math.ceil(Number(date.slice(5,7))/3)):brcSuccessCurrent()[kind];
 const timeline=brcSaved.successTimeline;
 if(!timeline)return brcSaved.conditions;
 return timeline[kind].filter(item=>item.from<=from).at(-1)?.conditions||timeline.baseline;
}

function brcSuccessPeriodText(kind,from){const period=from||(kind==='year'?'2026':'2026-Q1');return kind==='year'?period.slice(2)+'年':period.slice(2).replace('-Q','/Q')}
function brcSuccessRules(kind){
 const timeline=brcSaved.successTimeline||brcSuccessReadTimeline(null,brcSaved.conditions,brcSaved.values),current=brcSuccessCurrent()[kind];
 const rows=[{from:'',conditions:timeline.baseline},...timeline[kind]],active=rows.filter(row=>row.from<=current).at(-1);
 return rows.map((row,index)=>({...row,status:row===active?'current':row.from>current?'pending':'history',until:rows[index+1]?.from||''}));
}
function brcSuccessRuleStatus(status){return {current:'当前生效',pending:'待生效',history:'历史规则'}[status]}

// 初始方案的展示期间也参与唯一性校验；保留旧基线供更早历史取值。
function brcSuccessStart(kind){return kind==='year'?'2026':'2026-Q1'}
function brcSuccessVisibleRules(kind){return brcSuccessRules(kind).filter(row=>row.from||!row.until||row.until>brcSuccessStart(kind))}
function brcSuccessEffectiveFrom(kind,row){return row.from||brcSuccessStart(kind)}
function brcSuccessConflict(kind,from,originalFrom=null){return brcSuccessVisibleRules(kind).find(row=>row.from!==originalFrom&&brcSuccessEffectiveFrom(kind,row)===from)}
function brcSuccessDuplicateText(kind,from){return brcSuccessPeriodText(kind,from)+'已有规则，请在查看规则中编辑'}
