// 条件目录与旧数值键分离；计算参数不提供比较运算，判灯按完整结果集维护。
const brcParameterKeys=new Set(['stock.refurbDays','new.successRate','new.deliveryDays','new.exitDays','finance.deduction','stock.top.minAgeDays']);
const brcParameterLabels={'stock.refurbDays':'翻新标准周期','stock.refurbSecond':'延期一档','stock.refurbThird':'延期二档','new.deliveryDays':'大货交付允许延后','new.exitDays':'季度结束后出池天数'};
const brcBands=[];
function brcAddBand(id,group,section,unit,keys,style,min,max,integer=false){
 const tones=style==='score'?['red','yellow','green']:style==='decline'?['gray','red']:['green','yellow','red'];
 brcBands.push({id,group,section,unit,keys,style,min,max,integer,tones});
}
brcAddBand('attainment','common','达成率判灯','%',['lights.green','lights.yellow','lights.red'],'higher',0,1000);
for(const [name,key] of [['总退偏差','return'],['已收退偏差','received']])brcAddBand('return.'+key,'products',name+'红绿灯','%',['lights.'+key+'.green','lights.'+key,'lights.'+key+'.red'],'deviation',-100,100);
for(const [mode,label] of [['month','月度'],['quarter','季度'],['year','年度']])brcAddBand('turn.'+mode,'stock',label+'库存周转率判灯','次',['lights.turn.'+mode+'.green','lights.turn.'+mode+'.yellow','lights.turn.'+mode+'.red'],'higher',0,1000000);
brcAddBand('delivery','stock','交付及时率判灯','%',['lights.delivery.green','lights.delivery.yellow','lights.delivery.red'],'higher',0,100);
brcAddBand('decline','common','环比涨跌判色','%',['lights.decline','lights.decline.red'],'decline',0,1000000);
for(const platform of ['抖音','快手','天猫','京东'])brcAddBand('score.'+platform,'shops',platform+'店铺分','分',['shops.'+platform+'.red','shops.'+platform+'.yellow','shops.'+platform+'.green'],'score',0,5);
const brcBandKeys=new Set(brcBands.flatMap(b=>b.keys));
const brcEditorItems=[];
for(const band of brcBands)for(const [index,key] of band.keys.entries()){
 const tone=band.tones[index],legacy=brcDefinitions.find(r=>r.key===key);
 brcEditorItems.push({...band,key,kind:'condition',band:band.id,tone,label:({green:'绿灯',yellow:'黄灯',red:'红灯',gray:'灰色'})[tone],legacy:legacy?.key,anchor:band.style==='score'&&index===1||band.style==='lower'&&index===1||band.style==='deviation'&&index===1?'b':'a'});
}
for(const rule of brcDefinitions){
 if(rule.editable===false||brcBandKeys.has(rule.key)||rule.key==='grades.B.salesBelow')continue;
 brcEditorItems.push({...rule,kind:brcParameterKeys.has(rule.key)?'parameter':'condition',legacy:rule.key,anchor:['stock.refurbSecond','stock.refurbThird'].includes(rule.key)?'b':'a',label:brcParameterLabels[rule.key]||rule.label.replace(/下限|上限|上界|下界/g,''),aliases:rule.key==='grades.B.salesAbove'?['grades.B.salesBelow']:[]});
}
const brcEditorByKey=new Map(brcEditorItems.map(item=>[item.key,item]));
// 撤下的业务对象仍保留完整运行时目录，只允许提交页面内可配置的对象。
const brcConfigurableItems=brcEditorItems.filter(item=>item.configurable!==false&&brcGroups.some(([group])=>group===item.group));
const brcOperators=[['gt','>'],['gte','≥'],['lt','<'],['lte','≤'],['eq','=']];
function brcDefaultConditions(values){
 const out={},one=(op,a)=>({op,a}),between=(a,b,lower=true,upper=false)=>({op:'all',conditions:[{op:lower?'gte':'gt',a},{op:upper?'lte':'lt',a:b}]});
 for(const item of brcEditorItems.filter(i=>i.kind==='condition'&&!i.band))out[item.key]=item.key==='grades.B.salesAbove'?between(values[item.key],values['grades.B.salesBelow'],true,true):one(({'＞':'gt','>':'gt','≥':'gte','＜':'lt','<':'lt','≤':'lte','＝':'eq','=':'eq'})[item.op]||'gte',values[item.key]);
 for(const band of brcBands){
  const [a,b,c]=band.keys;
  if(band.style==='higher'){out[a]=one('gte',values[a]);out[b]=between(values[b],values[a]);out[c]=one('lt',values[b]);}
  if(band.style==='lower'){out[a]=one('lte',values[a]);out[b]=between(values[a],values[b],false,true);out[c]=one('gt',values[b]);}
  if(band.style==='deviation'){const lower=band.id==='return.return'?1:.3;out[a]=one('lt',lower);out[b]=between(lower,values[b],true,true);out[c]=one('gt',values[b]);}
  if(band.style==='decline'){out[a]=one('lte',values[a]);out[b]=one('gt',values[a]);}
  if(band.style==='score'){const strict=band.id==='score.天猫';out[a]=one(strict?'lt':'lte',values[a]);out[b]=between(values[a],values[b],strict,false);out[c]=one('gte',values[b]);}
 }
 Object.assign(out,brcRefurbDefaultConditions(values));
 return out;
}

// 指标只列出该判定现场实际可提供的数据；metric省略时沿用原规则键的指标。
function brcMetricConfig(key){
 const item=brcEditorByKey.get(key);
 const choices=entries=>entries.map(([id,label,source])=>{const field=brcEditorByKey.get(source);return {id,label,unit:field.unit,min:field.min,max:field.max,integer:field.integer,valueType:field.valueType||'number'}});
 if(item.band?.startsWith('score.'))return {default:'value',choices:[['value','店铺分'],['productScore','商品分'],['logisticsScore','物流分'],['serviceScore','服务分']].map(([id,label])=>({id,label,unit:'分',min:0,max:5,integer:false}))};
 if(key.startsWith('stock.warning.')||key.startsWith('stock.shortage.'))return {
  default:({'stock.warning.warehouse':'warehouse','stock.warning.netSales':'netSales15','stock.warning.coverageDays':'coverage15','stock.shortage.excluded':'excluded','stock.shortage.netSales':'netSales15','stock.shortage.sellableDays':'sellableCoverage15','stock.shortage.totalDays':'totalCoverage15'})[key],
  choices:choices([['warehouse','我司可售库存','stock.warning.warehouse'],['netSales15','近15日净销量','stock.warning.netSales'],['coverage15','我司可售天数','stock.warning.coverageDays'],['sellableCoverage15','可售天数','stock.shortage.sellableDays'],['totalCoverage15','总可售天数','stock.shortage.totalDays'],...(key.startsWith('stock.shortage.')?[['excluded','是否清仓或下架','stock.shortage.excluded']]:[])])
 };
 if(brcRefurbCycleKeys.includes(key))return {default:'value',choices:[{id:'value',label:'翻新耗时',unit:'天',min:0,max:365,integer:true}]};
 if(item.band?.startsWith('return.'))return {default:'value',choices:[{id:'value',label:item.band==='return.received'?'已收退偏差':'总退偏差',unit:item.unit,min:item.min,max:item.max,integer:item.integer}]};
 if(['new.quarterGsv','new.yearGsv','new.seasonGsv','new.profit','new.return'].includes(key))return {
  default:key==='new.profit'?'profitRate':key==='new.return'?'returnRate':'gsv',
  choices:choices([['gsv','GSV','new.quarterGsv'],['profitRate','利润率','new.profit'],['returnRate','总退','new.return']])
 };
 if(key.startsWith('grades.'))return {default:key.includes('.sales')?'gsv':'profitRate',choices:choices(key.includes('.sales')?[['gsv','月销GSV','grades.S.salesAbove']]:[['profitRate','利润率','grades.S.profitAbove']])};
 if(['quality.orders','quality.returnDelta','quality.contactDelta'].includes(key))return {default:key==='quality.orders'?'orders':key==='quality.returnDelta'?'returnDelta':'value',choices:choices([
  ['orders','有效订单','quality.orders'],['returnDelta','总退环比增长值','quality.returnDelta'],[key==='quality.contactDelta'?'value':'contactDelta','总进线率环比增长值','quality.contactDelta']
 ])};
 if(['quality.worsenSales','quality.worsenReturn','quality.worsenReceived'].includes(key))return {default:key==='quality.worsenSales'?'netSales':key==='quality.worsenReturn'?'returnDelta':'receivedDelta',choices:choices([['netSales','销量','quality.worsenSales'],['returnDelta','总退环比增长值','quality.worsenReturn'],['receivedDelta','已收退环比增长值','quality.worsenReceived']])};
 if(['stock.profit','stock.return','stock.received','stock.violations'].includes(key))return {default:({'stock.profit':'profitRate','stock.return':'returnRate','stock.received':'receivedRate','stock.violations':'value'})[key],choices:choices([
  ['profitRate','利润率','stock.profit'],['returnRate','总退','stock.return'],['receivedRate','已收退','stock.received'],[key==='stock.violations'?'value':'violationCount','当月下架与冻结次数','stock.violations']
 ])};
 if(['shops.penalties','shops.fine'].includes(key))return {default:'value',choices:choices(key==='shops.penalties'?
  [['value','品质处罚次数','shops.penalties'],['qualityFine','品质罚款金额','shops.fine']]:
  [['value','品质罚款金额','shops.fine'],['qualityPenaltyCount','品质处罚次数','shops.penalties']])};
 if(['stock.slowDays','stock.shortDays','stock.transferDays'].includes(key))return {default:'value',choices:choices([
  [key==='stock.shortDays'?'coverage15':'value','我司可售天数','stock.slowDays'],
  ['sellableCoverage15','可售天数','stock.shortDays'],
  [key==='stock.shortDays'?'value':'totalCoverage15','总可售天数','stock.shortDays']
 ])};
 const label=item.band?item.section.replace(/判灯|判色/g,''):item.label;
 return {default:'value',choices:[{id:'value',label,unit:item.unit,min:item.min,max:item.max,integer:item.integer}]};
}
function brcTermMetric(key,term){const config=brcMetricConfig(key);return config.choices.find(metric=>metric.id===(term?.metric||config.default))}
function brcTermItem(item,term){return {...item,...brcTermMetric(item.key,term),key:item.key}}

// 编辑器统一显示单位；存储和业务计算继续使用原指标单位。
function brcEditorUnit(unit){return {label:unit==='元'||unit==='万元'?'w':unit,scale:unit==='元'?10000:1}}
function brcEditorDisplayValue(value,unit){return value===null||value===undefined?'':Number((value/brcEditorUnit(unit).scale).toFixed(12))}
function brcEditorSourceValue(value,unit){return value===''?null:Number((Number(value)*brcEditorUnit(unit).scale).toFixed(8))}
