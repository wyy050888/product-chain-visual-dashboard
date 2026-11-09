// 品质榜试版：卡片指标与抽屉字段共用原值、环比及处罚台账。
const rpQualityCardKeys=['fine','frozen','offShelf','gsv'];
const rpQualityListKeys=['gsv','sales','netSales','margin','return','received','violations','fine','frozen','offShelf','drop','season','productType'];
// 字段是否适用由所属平台决定；全平台仅保留列，不把不适用字段当作0。
function rpViolationMetricAllowed(key,platform='all'){
 const platforms=(Array.isArray(platform)?platform:[platform]).filter(Boolean);
 if(!platforms.length||platforms.includes('all'))return true;
 const type=({罚款:'fine',资金冻结:'frozen',掉权:'drop',下架:'offShelf'})[key]||(/^fine/.test(key)?'fine':/^frozen/.test(key)?'frozen':key);
 const excluded={fine:['抖音','视频号'],frozen:['快手','天猫','京东'],drop:['抖音','快手','视频号','天猫','京东']};
 return !excluded[type]||platforms.some(p=>!excluded[type].includes(p));
}
function rpPlatformViolationEvents(events,scope='all',platform=null){
 return events.filter(e=>rpViolationMetricAllowed(e.type,e.platform||platform||scope));
}
function rpViolationField(field,platform){
 return rpViolationMetricAllowed(field.key,platform)?field:{...field,value:'--',sortValue:null,tone:'rp-quality-gray',target:'',targetTone:'',hint:''};
}
function rpQualityMoney(yuan){return pfMoneyYuan(yuan).replace(/元$/,'')}
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
// 率和数量的正负号展示，与金额/销量使用的箭头格式分开。
function rpSignedComparisonText(raw,unit='%',digits=1){
 if(!Number.isFinite(raw))return '环比 —';
 const value=Math.round(Math.abs(raw)*10**digits)/10**digits;
 return value===0?'环比 持平':'环比 '+(raw>0?'+':'-')+fmt(value,digits)+unit;
}
function rpCountComparison(current,previous,unit='次'){
 const delta=Number.isSafeInteger(current)&&current>=0&&Number.isSafeInteger(previous)&&previous>=0?current-previous:null;
 return {target:rpSignedComparisonText(delta,unit,0),targetTone:'rp-quality-'+(delta===null||delta===0?'gray':delta>0?'red':'green')};
}
function rpCountComparisonRuleText(){return '环比＝本期次数－上期次数；涨红降绿，持平和缺失灰色。'}
function rpQualityChange(current,previous){return rpComparisonText(rpQualityChangeValue(current,previous))}
function rpComparisonText(raw){
 if(!Number.isFinite(raw))return '环比 --';
 const change=Math.sign(raw)*Math.round(Math.abs(raw)*10)/10;
 if(change===0)return '环比 持平';
 return '环比 '+(change>0?'↑ ':change<0?'↓ ':'')+upPercent(Math.abs(change));
}
// 共用相对环比色：涨跌幅度均先判灰色区间，区间外涨绿降红。
function rpComparisonTone(change,reverse=false){
 if(!Number.isFinite(change)||Math.round(Math.abs(change)*10)===0)return 'rp-quality-gray';
 const tone=brcBandTone('decline',Math.abs(change));
 return 'rp-quality-'+(tone==='red'&&(reverse?change<0:change>0)?'green':tone);
}
function rpComparisonRuleText(reverse=false){return (reverse?'涨红降绿':'涨绿降红')+'；涨跌幅度满足'+brcDescribe('lights.decline')+'时灰色；持平和无可比数据灰色。'}
function rpQualityChangeTone(current,previous,reverse=false){return rpComparisonTone(rpQualityChangeValue(current,previous),reverse)}
// 利润率与净利润率均用百分点差，不除以上期，不设置灰色区间。
function rpProfitRateComparison(current,previous){
 const delta=Number.isFinite(current)&&Number.isFinite(previous)?current-previous:null;
 const shown=Number.isFinite(delta)?Math.sign(delta)*Math.round(Math.abs(delta)*10)/10:null;
 const tone='rp-quality-'+(shown===null||shown===0?'gray':shown>0?'green':'red');
 return {target:rpSignedComparisonText(delta),targetTone:tone};
}
function rpProfitRateComparisonRuleText(){return '环比＝本期利润率 - 上期利润率，以%展示；涨绿降红，不设10%灰色区间；持平和缺失灰色。'}
// 进线率与差评率显示差值（%）；不除以上期，符号统一为正负号。
function rpRateDeltaComparison(current,previous){
 const delta=qrbRateDelta(current,previous),shown=Number.isFinite(delta)?Math.sign(delta)*Math.round(Math.abs(delta)*10)/10:null;
 // 与一位小数文案使用同一变化值，避免显示“持平”却仍有涨跌颜色。
 return {target:rpSignedComparisonText(delta),targetTone:'rp-quality-'+(shown===null||shown===0?'gray':shown>0?'red':'green')};
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
 if(bad)patch('bad',{tone:Number.isFinite(current.badRate)?'':'rp-quality-gray',...rpRateDeltaComparison(current.badRate,previous.badRate),hint:'差评率＝差评数量÷有效评价数量×100%；环比值＝本期差评率－上期差评率，单位为%；上期为0%仍可计算，缺少有效评价时显示--。'});
 for(const [key,name,metric] of [['contact','进线率','contactRate'],['qualityContact','品质问题进线率','qualityContactRate'],['experienceContact','体验问题进线率','experienceContactRate']]){
  const actual=current[metric],prior=previous[metric];
  const props={value:Number.isFinite(actual)?upPercent(actual):'--',sortValue:actual,tone:Number.isFinite(actual)?'':'rp-quality-gray',...rpRateDeltaComparison(actual,prior),hint:(key==='contact'?'总进线工单数（品质问题＋体验问题）':'对应问题类型工单数')+'÷同期销量×100%；环比增长值＝本期进线率－上期进线率，单位为%。进线预警按环比增长值'+brcDescribe('quality.contactDelta')+'判定。上期为0%且有销量仍可计算；无有效销量时不作判定。'};
  if(fields.some(f=>f.key===key))patch(key,props);else fields.push({...rpField(key,name,props.value),...props});
 }
 patch('sales',{value:fmt(current.sales),hint:'所选期间、所选平台的销量，未扣除退货；'+compareHint});
 patch('gsv',{value:rpQualityMoney(current.gsvCents/100)});
 for(const [key,name,actual,targetKey] of [['return','总退',current.returnRate,'returnTarget'],['received','已收退',current.receivedRate,'receivedTarget']]){
  const target=fields.find(f=>f.key===targetKey)?.sortValue;
  const rule=rpQualityReturnRule(actual,target,key),old=fields.find(f=>f.key===key);
  patch(key,{name,...rule,hint:(old?.hint||'')+(Number.isFinite(target)?rpReturnDeviationHint(key):'')});
 }
 patch('fine',{value:rpQualityMoney(fineAmount),sortValue:fineAmount,target:fine.length+'次',tone:rpQualityAmountTone(fineAmount),targetTone:'rp-quality-gray',hint:scope+'的平台罚款金额及次数。'});
 patch('frozen',{value:rpQualityMoney(frozenAmount),sortValue:frozenAmount,target:frozen.length+'次',tone:rpQualityAmountTone(frozenAmount),targetTone:'rp-quality-gray',hint:scope+'的资金冻结事件金额及次数，不作为实时冻结余额。'});
 const net=current.sales-current.returned,oldNet=previous.sales-previous.returned;
 fields.push({...rpField('netSales','销量',fmt(net),'','同期销量－同期总退件数；'+compareHint,rpQualityChange(net,oldNet)),sortValue:net,targetTone:rpQualityChangeTone(net,oldNet)});
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
 append(contact,'p','环比值＝本期进线率－上期进线率（%），用＋／－表示增减，不除以上期进线率。');
 const sources=append(contact,'dl','');
 for(const [label,value] of [
  ['工单来源','运营罗盘 · 客服管理 · 售后导入明细（进线问题汇总）'],
  ['统计时间','按订单下单时间统计当月该产品的品质问题、体验问题进线工单'],
  ['销量来源','数智罗盘每月对应产品的实际成交销量'],
  ['分项口径','品质问题、体验问题分别以各自工单数除以同期销量，两类互斥、合计为总进线率'],
  ['预警判定','进线率环比增长值'+brcDescribe('quality.contactDelta')+'；无有效销量时不以进线增长判定']
 ]){append(sources,'dt',label);append(sources,'dd',value)}
 const bad=append(container,'section','','qr-rate-tip-section');
 append(bad,'h5','差评率');
 append(bad,'div','差评数量 ÷ 总评价数量 × 100%','qr-rate-tip-formula');
 append(bad,'p','环比值＝本期差评率－上期差评率（%），例如上期3%、本期4%，显示环比＋1.0%。');
 append(bad,'p','分子、分母使用同一产品、同一平台、同一统计期间的有效评价。');
}
