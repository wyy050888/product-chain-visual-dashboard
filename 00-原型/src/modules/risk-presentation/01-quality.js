// 品质榜试版：卡片指标与抽屉字段共用原值、环比及处罚台账。
const rpQualityCardKeys=['fine','frozen','offShelf','drop','gsv'];
const rpQualityListKeys=['violations','fine','frozen','offShelf','drop','return','received','gsv','sales','netSales','margin','season','productType'];
// 店铺违规信息收集261104：产品榜与店铺榜共用平台适用范围，店铺限单仅用于店铺。
const rpViolationPlatformTypes={
 抖音:['frozen','offShelf','limited'],快手:['fine','offShelf'],视频号:['frozen','offShelf','limited'],
 天猫:['fine','offShelf'],京东:['fine','frozen','offShelf','drop','limited'],拼多多:['fine','offShelf','drop']
};
function rpViolationMetricKey(key){
 return ({罚款:'fine',资金冻结:'frozen',下架:'offShelf',掉权:'drop',限单:'limited'})[key]||(/^fine/.test(key)?'fine':/^frozen/.test(key)?'frozen':key);
}
// 不适用字段按缺省值展示，适用字段按该平台的期间事实统计。
function rpViolationMetricAllowed(key,platform='all'){
 const type=rpViolationMetricKey(key);
 if(type==='limited')return false;
 if(!['fine','frozen','offShelf','drop'].includes(type))return true;
 const platforms=(Array.isArray(platform)?platform:[platform]).filter(Boolean);
 return !platforms.length||platforms.includes('all')||platforms.some(p=>rpViolationPlatformTypes[p]?.includes(type));
}
function rpPlatformViolationEvents(events,scope='all',platform=null){
 return events.filter(e=>rpViolationMetricAllowed(e.type,e.platform||platform||scope));
}
function rpViolationField(field,platform){
 return rpViolationMetricAllowed(field.key,platform)?field:{...field,value:'--',sortValue:null,tone:'rp-quality-gray',target:'',targetTone:'',hint:''};
}
function rpQualityMoney(yuan){return pfMoneyYuan(yuan).replace(/元$/,'')}
// 汇总使用同一期间和产品筛选下的全平台SPU行。
function rpQualitySummaryMarkup(rows){
 const totals={fine:0,frozen:0,offShelf:0,dropCount:0};
 for(const {monthly} of rows){
  totals.fine+=monthly.fine;
  totals.frozen+=monthly.frozen;
  totals.offShelf+=monthly.offShelf;
  totals.dropCount+=monthly.dropCount;
 }
 const money=value=>'¥'+fmt(value,Number.isInteger(value)?0:2);
 const count=(value,unit)=>`${fmt(value)} <span class="rp-quality-summary-unit">${unit}</span>`;
 const metrics=[
  ['products','违规产品',rows.length,value=>count(value,'个')],
  ['fine','平台罚款',totals.fine,money],
  ['frozen','资金冻结',totals.frozen,money],
  ['offShelf','链接下架',totals.offShelf,value=>count(value,'次')],
  ['drop','链接掉权',totals.dropCount,value=>count(value,'次')]
 ];
 const periodLabel=periodShortText(periodFor('risk')).replace('近30天','近30日').replace('当日','所选期间');
 return `<div class="rp-quality-summary"><div class="rp-quality-summary-period"><span>${esc(periodLabel)}</span> <strong>全平台合计</strong></div><dl class="rp-quality-summary-metrics" aria-label="${esc(periodLabel)}全平台违规汇总">${metrics.map(([key,label,value,format])=>{
  const tone=value===0?'muted':key==='products'?'total':'risk';
  return `<div class="rp-quality-summary-metric" data-rp-summary="${key}" data-tone="${tone}"><dt>${label}</dt><dd>${format(value)}</dd></div>`;
 }).join('')}</dl></div>`;
}
// 原因未分类的事件仅进入全部口径，不能默认归为品质原因。
function rpQualitySelectEvents(monthly,qualityOnly=true){
 return (monthly.allEvents||monthly.events||[]).filter(e=>['罚款','资金冻结','下架','掉权'].includes(e.type)&&(!qualityOnly||e.reasonType==='quality'));
}
function rpQualityEvents(record,start,end,qualityOnly=true){
 const product=upProduct(upIdentity(record)),observation=record.platform==='all'||Array.isArray(record.platform)?qfViolationObservation(product,record.platform,start,end):qrObservation(product,record.platform,start,end);
 return rpQualitySelectEvents(observation.monthly,qualityOnly);
}
// 常规经营环比色；进线率与差评率另按风险方向判断。
function rpQualityChangeValue(current,previous){
 if(!Number.isFinite(current)||!Number.isFinite(previous))return null;
 return current===previous?0:previous>0?(current-previous)/previous*100:null;
}
function rpCountComparison(current,previous,unit='次'){
 const delta=Number.isSafeInteger(current)&&current>=0&&Number.isSafeInteger(previous)&&previous>=0?current-previous:null;
 const change=delta===null?'—':delta===0?'持平':(delta>0?'+':'-')+fmt(Math.abs(delta))+unit;
 return {target:'环比 '+change,targetTone:'rp-quality-'+(delta===null||delta===0?'gray':delta>0?'red':'green')};
}
function rpCountComparisonRuleText(){return '环比＝本期次数－上期次数；涨红降绿，持平和缺失灰色。'}
function rpQualityChange(current,previous){return rpComparisonText(rpQualityChangeValue(current,previous))}
function rpComparisonText(raw){return '环比 '+periodRateGrowthText(raw,'--')}
// 共用相对环比色：涨跌幅度均先判灰色区间，区间外涨绿降红。
function rpComparisonTone(change,reverse=false){
 if(!Number.isFinite(change)||Math.round(Math.abs(change)*10)===0)return 'rp-quality-gray';
 const tone=brcBandTone('decline',Math.abs(change));
 return 'rp-quality-'+(tone==='red'&&(reverse?change<0:change>0)?'green':tone);
}
function rpComparisonRuleText(reverse=false){return (reverse?'涨红降绿':'涨绿降红')+'；涨跌幅度满足'+brcDescribe('lights.decline')+'时灰色；持平和无可比数据灰色。'}
function rpQualityChangeTone(current,previous,reverse=false){return rpComparisonTone(rpQualityChangeValue(current,previous),reverse)}
// 利润率与净利润率按相对增长判色。
function rpProfitRateComparison(current,previous){
 const growth=periodRateGrowth(current,previous);
 const shown=Number.isFinite(growth)?Math.sign(growth)*Math.round(Math.abs(growth)*10)/10:null;
 const tone='rp-quality-'+(shown===null||shown===0?'gray':shown>0?'green':'red');
 return {target:'环比 '+periodRateGrowthText(growth),targetTone:tone};
}
function rpProfitRateComparisonRuleText(){return '环比增长率＝（本期利润率－上期利润率）÷上期利润率绝对值×100%。涨绿降红，持平和无可比数据灰色。'}
// 风险类比率上升标红，下降标绿。
function rpRiskRateComparison(current,previous){
 const growth=periodRateGrowth(current,previous),shown=Number.isFinite(growth)?Math.sign(growth)*Math.round(Math.abs(growth)*10)/10:null;
 // 与一位小数文案使用同一变化值，避免显示“持平”却仍有涨跌颜色。
 return {target:'环比 '+periodRateGrowthText(growth),targetTone:'rp-quality-'+(shown===null||shown===0?'gray':shown>0?'red':'green')};
}
// 普通总退/已收退按实际减目标的差值判灯，两个上界均归黄灯。
const rpReturnDeviationLimits={return:2,received:0.5};
function rpReturnDeviationHint(kind='return'){
 return '偏差＝实际退货率－目标退货率，单位为%。'+(kind==='received'?brcBandText('return.received')+'。':'');
}
function rpQualityReturnRule(actual,target,kind='return'){
 if(!Number.isFinite(actual))return {tone:'rp-quality-gray',targetTone:'rp-quality-gray',target:''};
 if(!Number.isFinite(target)||target<0)return {tone:'rp-quality-normal',targetTone:'rp-quality-gray',target:''};
 const gap=actual-target,epsilon=1e-10,tone=brcBandTone('return.'+(kind==='received'?'received':'return'),gap);
 return {tone:'rp-quality-'+(tone==='green'?'normal':tone),targetTone:'rp-quality-'+tone,target:'偏差 '+(gap>epsilon?'+':'')+upPercent(Math.abs(gap)<=epsilon?0:gap)};
}
function rpQualityAmountTone(value){return 'rp-quality-'+(Number.isFinite(value)&&value>0?'red':'gray')}
function rpQualityProductFields(record){
 const identity=pfIdentity(record),tags=[];
 if(identity.isNew===true)tags.push({kind:'new',label:'新品'});
 else if(identity.isNew===false)tags.push({kind:'old',label:'老品'});
 if(identity.clearance===true)tags.push({kind:'clearance',label:'清仓品'});
 return [rpField('season','季品',identity.attribute||'—'),{...rpField('productType','属性',tags.map(t=>t.label).join('、')||'—'),tags}];
}
function rpQualityFields(record,fields,current,previous,qualityOnly=true,violationPlatform='all'){
 fields.push(...rpQualityProductFields(record));
 const events=rpPlatformViolationEvents(rpQualitySelectEvents(record.monthly,qualityOnly),violationPlatform,record.platform),earlier=rpPlatformViolationEvents(rpQualityEvents(record,previous.start,previous.end,qualityOnly),violationPlatform,record.platform);
 const fine=events.filter(e=>e.type==='罚款'),frozen=events.filter(e=>e.type==='资金冻结');
 const fineAmount=fine.reduce((sum,e)=>sum+(Number(e.amount)||0),0),frozenAmount=frozen.reduce((sum,e)=>sum+(Number(e.amount)||0),0),scope=qualityOnly?'品质原因':'全部原因';
 const patch=(key,props)=>{const field=fields.find(f=>f.key===key);if(field)Object.assign(field,props)};
 const compareHint='上期为紧邻的等长区间；环比＝（本期－上期）÷上期；'+rpComparisonRuleText();
 for(const [key,now,before] of [['sales',current.sales,previous.sales],['gsv',current.gsvCents,previous.gsvCents],['margin',current.profitRate,previous.profitRate]]){
  const old=fields.find(f=>f.key===key);
  const comparison=key==='margin'?rpProfitRateComparison(now,before):{target:rpQualityChange(now,before),targetTone:rpQualityChangeTone(now,before)};
  patch(key,{tone:Number.isFinite(now)?'':'rp-quality-gray',...comparison,hint:(old?.hint||'')+(key==='margin'?rpProfitRateComparisonRuleText():compareHint)});
 }
 const bad=fields.find(f=>f.key==='bad');
 if(bad)patch('bad',{tone:Number.isFinite(current.badRate)?'':'rp-quality-gray',...rpRiskRateComparison(current.badRate,previous.badRate),hint:'差评率＝差评数量÷有效评价数量×100%；环比增长率＝（本期比率－上期比率）÷上期比率×100%。上期为0或任一期缺失时显示—。'});
 for(const [key,name,metric] of [['contact','进线率','contactRate'],['qualityContact','品质问题进线率','qualityContactRate'],['experienceContact','体验问题进线率','experienceContactRate']]){
  const actual=current[metric],prior=previous[metric];
  const props={value:Number.isFinite(actual)?upPercent(actual):'--',sortValue:actual,tone:Number.isFinite(actual)?'':'rp-quality-gray',...rpRiskRateComparison(actual,prior),hint:(key==='contact'?'总进线工单数（品质问题＋体验问题）':'对应问题类型工单数')+'÷同期销量×100%；环比增长率＝（本期比率－上期比率）÷上期比率×100%。上期为0或任一期缺失时显示—。进线预警按环比增长率'+brcDescribe('quality.contactDelta')+'判定。'};
  if(fields.some(f=>f.key===key))patch(key,props);else fields.push({...rpField(key,name,props.value),...props});
 }
 patch('sales',{value:formatSalesQuantity(current.sales),hint:'所选期间、所选平台的销量，未扣除退货；'+compareHint});
 patch('gsv',{value:rpQualityMoney(current.gsvCents/100)});
 for(const [key,name,actual,targetKey] of [['return','总退',current.returnRate,'returnTarget'],['received','已收退',current.receivedRate,'receivedTarget']]){
  const target=fields.find(f=>f.key===targetKey)?.sortValue;
  const rule=rpQualityReturnRule(actual,target,key),old=fields.find(f=>f.key===key);
  patch(key,{name,...rule,hint:(old?.hint||'')+(Number.isFinite(target)?rpReturnDeviationHint(key):'')});
 }
 patch('fine',{value:rpQualityMoney(fineAmount),sortValue:fineAmount,target:fine.length+'次',tone:rpQualityAmountTone(fineAmount),targetTone:'rp-quality-gray',hint:scope+'的平台罚款金额及次数。'});
 patch('frozen',{value:rpQualityMoney(frozenAmount),sortValue:frozenAmount,target:frozen.length+'次',tone:rpQualityAmountTone(frozenAmount),targetTone:'rp-quality-gray',hint:scope+'的资金冻结事件金额及次数，不作为实时冻结余额。'});
 const net=current.sales-current.returned,oldNet=previous.sales-previous.returned;
 fields.push({...rpField('netSales','销量',formatSalesQuantity(net),'','同期销量－同期总退件数；'+compareHint,rpQualityChange(net,oldNet)),sortValue:net,targetTone:rpQualityChangeTone(net,oldNet)});
 const violationComparison=rpCountComparison(events.length,earlier.length);
 fields.push({...rpField('violations','违规次数',String(events.length),'',scope+'的罚款、资金冻结、下架、掉权事件合计；上期取紧邻等长区间；'+rpCountComparisonRuleText(),violationComparison.target),sortValue:events.length,targetTone:violationComparison.targetTone});
 // 下架与掉权分别展示；每项环比都使用各自事件基数，保留合计字段供旧入口读取。
 for(const [key,name,types] of [['down','链接下架/掉权',['下架','掉权']],['offShelf','链接下架',['下架']],['drop','链接掉权',['掉权']]]){
  const count=events.filter(e=>types.includes(e.type)).length,before=earlier.filter(e=>types.includes(e.type)).length;
  const comparison=rpCountComparison(count,before);
  const field={...rpField(key,name,count+'次','','所选期间'+scope+types.join('、')+'事件次数；上期取紧邻等长区间；'+rpCountComparisonRuleText(),comparison.target),sortValue:count,targetTone:comparison.targetTone};
  if(fields.some(f=>f.key===key))patch(key,field);else fields.push(field);
 }
 const amount=fineAmount+frozenAmount;
 fields.push({...rpField('sanctions','罚款＆冻结',rpQualityMoney(amount),rpQualityAmountTone(amount),'平台罚款金额与期间冻结事件金额相加；第二行为罚款与冻结事件总次数，不作为实时冻结余额。',(fine.length+frozen.length)+'次'),sortValue:amount,targetTone:'rp-quality-gray'});
 return fields.map(field=>rpViolationField(field,record.platform));
}
function rpQualityRatesHelp(){return '<span class="metric-help rp-quality-rate-help" role="button" tabindex="0" aria-label="查看进线率与差评率计算口径" data-quality-rates="true" data-metric-rule="进线率与差评率计算口径"></span>'}
function rpQualityCardColumns(){
 const names=['平台罚款','资金冻结','链接下架','链接掉权','GSV'];
 return '<div class="rp-quality-columns">'+names.map(name=>'<span>'+name+'</span>').join('')+'</div>';
}
function rpQualityCardEntry(record,index){
 const fields=rpFields(0,record,rpQualityCardKeys,rpCardPlatform(0));
 return '<article class="rp-entry rp-quality-entry" data-rp-kind="0" data-rp-row="0:'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(0,record,false,true)+'</header><div class="rp-quality-values">'+fields.map(f=>'<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(f.name)+'"><span class="rp-quality-mobile-label">'+esc(f.name)+'</span><strong class="'+esc(f.tone)+'">'+numberSignalMain(f)+'</strong><small class="'+esc(f.targetTone||'')+'">'+rpTargetText(f)+'</small></div>').join('')+'</div></div></article>';
}

// 进线与评价口径分别展示，避免把销量误作差评率的分母。
function renderQualityRatesTooltip(container){
 const append=(parent,tag,text,className='')=>{
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node;
 };
 append(container,'h4','进线率 / 差评率');
 const contact=append(container,'section','','qr-rate-tip-section');
 append(contact,'h5','进线率');
 append(contact,'div','当月总进线工单数 ÷ 当月产品实际成交销量 × 100%','qr-rate-tip-formula');
 append(contact,'p','环比增长率＝（本期比率－上期比率）÷上期比率×100%。上期为0或任一期缺失时显示—。');
 const sources=append(contact,'dl','');
 for(const [label,value] of [
  ['工单来源','运营罗盘 · 客服管理 · 售后导入明细（进线问题汇总）'],
  ['统计时间','按订单下单时间统计当月该产品的品质问题、体验问题进线工单'],
  ['销量来源','数智罗盘每月对应产品的实际成交销量'],
  ['分项口径','品质问题、体验问题分别以各自工单数除以同期销量，两类互斥、合计为总进线率'],
  ['预警判定','进线率环比增长率'+brcDescribe('quality.contactDelta')+'；无有效销量时不以进线增长判定']
 ]){append(sources,'dt',label);append(sources,'dd',value)}
 const bad=append(container,'section','','qr-rate-tip-section');
 append(bad,'h5','差评率');
 append(bad,'div','差评数量 ÷ 总评价数量 × 100%','qr-rate-tip-formula');
 append(bad,'p','差评率由3%升至4%时，显示环比 ↑ 33.3%。');
 append(bad,'p','分子、分母使用同一产品、同一平台、同一统计期间的有效评价。');
}
