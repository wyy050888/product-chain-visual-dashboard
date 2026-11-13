// 高危店铺展示模型：期间流量、处罚事件与结束日评分分别取数。
function rpShopMetricKeys(platform){
 const selected=Array.isArray(platform)?platform:[platform],types=selected.includes('all')?Object.values(rpViolationPlatformTypes).flat():selected.flatMap(name=>rpViolationPlatformTypes[name]||[]);
 return [...new Set(types),'problemSpus'];
}
function rpShopMetricAllowed(key,platform){
 const type=rpViolationMetricKey(key);
 return !['fine','frozen','offShelf','drop','limited'].includes(type)||rpShopMetricKeys(platform).includes(type);
}
const rpShopListKeys=['mainSpu','gsv','netSales','problemSpus','violations','fine','frozen','offShelf','drop','limited','score','productScore','logisticsScore','serviceScore'];
// 店铺分监控仅适用四平台；视频号保留原值，拼多多使用核心链接。
function rpShopScoreMonitored(platform){return ['抖音','快手','天猫','京东'].includes(platform)}
function rpShopScoreRule(platform){
 if(!rpShopScoreMonitored(platform))return undefined;
 const red=brcNumber('shops.'+platform+'.red'),yellow=brcNumber('shops.'+platform+'.yellow');
 return Number.isFinite(red)&&Number.isFinite(yellow)?[red,yellow]:undefined;
}
function rpShopScoreTone(platform,score,context={}){
 return rpShopScoreMonitored(platform)?'rp-quality-'+brcBandTone('score.'+platform,score,context):'rp-quality-normal';
}
// 显示文案与判灯函数共用阈值；天猫红灯下界不含等号。
function rpShopScoreBands(platform){
 if(!rpShopScoreMonitored(platform))return null;
 const rows=brcBandRows('score.'+platform);return rows.length?Object.fromEntries(rows.map(r=>[r.tone,r.text])):null;
}
function rpShopScoreHint(platform){
 if(platform==='视频号')return '视频号：暂不监控店铺分，目前店铺经常更换。';
 const bands=rpShopScoreBands(platform);
 return bands?platform+'店铺分：红灯 '+bands.red+'；黄灯 '+bands.yellow+'；绿灯 '+bands.green+'。':'暂无评分规则。';
}
function rpRenderShopScoreRules(host){
 const append=(parent,tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;parent.append(node);return node};
 const table=append(host,'table');table.className='rp-shop-score-rules';table.setAttribute('aria-label','各平台店铺分红黄绿阈值');
 const header=append(append(table,'thead'),'tr');
 for(const name of ['平台','红灯','黄灯','绿灯'])append(header,'th',name).scope='col';
 const body=append(table,'tbody');
 for(const platform of filterCatalog.platforms.filter(rpShopScoreMonitored)){
  const bands=rpShopScoreBands(platform),row=append(body,'tr');append(row,'th',platform).scope='row';
  for(const key of ['red','yellow','green']){const cell=append(row,'td',bands[key]);cell.dataset.tone=key;}
 }
 append(host,'p',rpShopScoreHint('视频号'));
}

function rpShopProblemHit(product){
 const currentTarget=product.currentTarget??product.target,previousTarget=product.previousTarget??product.target;
 return [product.current,product.previous,currentTarget,previousTarget].every(Number.isFinite)&&brcMatch('shops.returnExcess',product.current-currentTarget)&&brcMatch('shops.returnExcess',product.previous-previousTarget)&&periodRateGrowth(product.current,product.previous)>0;
}
function rpShopReturnRule(){return '店铺内单品总退连续 2 周期超出预设目标值 '+brcNumber('shops.returnExcess')+'% 以上，环比持续恶化；'}
function rpShopReturnPeriod(end=riskRange().end){return rpReturnPeriod('week',end,end)}
// 店铺单品使用本店销量/退货台账，两期均取T−16及以前的稳定数据。
function rpShopReturnProducts(shop,end){
 const period=rpShopReturnPeriod(end),previous=new Map(sampleShopSpuSales(shop,period.previousStart,period.previousEnd).map(row=>[row.product.spuId,row]));
 return sampleShopSpuSales(shop,period.start,period.end).map(row=>{
  const prior=previous.get(row.product.spuId),target=qrbReturnTargets(row.product,shop.channel).returnTarget;
  return {spuId:row.product.spuId,name:row.product.name,model:row.product.model,target,currentTarget:target,previousTarget:target,
   current:row.sales>0?row.returned/row.sales*100:null,previous:prior?.sales>0?prior.returned/prior.sales*100:null,
   currentSales:row.sales,currentReturned:row.returned,previousSales:prior?.sales??null,previousReturned:prior?.returned??null,
   start:period.start,end:period.end,previousStart:period.previousStart,previousEnd:period.previousEnd};
 });
}
function rpShopProblemField(shop,end,previousEnd){
 const count=date=>rpShopReturnProducts(shop,date).filter(rpShopProblemHit).length,current=count(end),previous=count(previousEnd),comparison=rpCountComparison(current,previous,'个');
 return {...rpField('problemSpus','问题SPU数',fmt(current)+'个','rp-quality-normal',rpShopReturnRule(),comparison.target),
  sortValue:current,targetTone:comparison.targetTone};
}
// 主营取所选结束日向前30日的单SPU销售额，与榜单经营筛选区间分开。
const rpShopCoreThresholdCents=50000000;
const rpShopCoreRule=`按所选结束日及前29个自然日累计，本店单个SPU的GSV≥${rpShopCoreThresholdCents/1000000}w（含${rpShopCoreThresholdCents/1000000}w）即为核心主营SPU，可有多个；不按季度或年度累计额判定。`;
function rpShopCoreFacts(shop,end=riskRange().end){
 const start=shiftDate(end,-29),cutoff=end<DATA_CUTOFF?end:DATA_CUTOFF;
 const rows=start>cutoff?[]:sdOperatingFacts(shop,start,cutoff).products;
 const products=rows.filter(row=>Number.isFinite(row.gsvCents)&&row.gsvCents>=rpShopCoreThresholdCents)
  .sort((a,b)=>b.gsvCents-a.gsvCents||a.product.spuCode.localeCompare(b.product.spuCode));
 return {start,end:cutoff,products,available:rows.some(row=>Number.isFinite(row.gsvCents))};
}
function rpShopPeriodEvents(shop,start,end,qualityOnly=true){
 const period=riskShopPeriod(shop,riskRange(start,end));
 const allEvents=period.events.map(e=>({...e,type:'fine',reasonType:'quality'}));
 // 冻结按期间事件金额展示，不冒充实时余额；新增三类事件是稳定日期的演示样例。
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1)){
  for(const [type,hit,day,amount] of [['frozen',shop.frozenAmount>0,6,shop.frozenAmount],['offShelf',shop.id%3===0,8,0],['drop',shop.id%3===1,9,0]]){
   const date=month+'-'+String(day).padStart(2,'0');
   if(hit&&date>=start&&date<=end&&date<=DATA_CUTOFF)allEvents.push({type,date,amount,source:'demo',reasonType:'quality'});
  }
  // 少量店铺保留持平；其他店铺按固定月份生成0—2次限单样例。
  const limitCount=shop.id%7===4?1:(Number(month.slice(0,4))*12+Number(month.slice(5,7))+shop.id)%3;
  for(let i=0;i<limitCount;i++){
   const date=month+'-0'+(5+i);
   if(date>=start&&date<=end&&date<=DATA_CUTOFF)allEvents.push({type:'limited',date,amount:0,source:'demo',reasonType:'quality'});
  }
 }
 const events=[...allEvents,...sampleShopNonQualityEvents(shop,start,end)].filter(e=>!qualityOnly||e.reasonType==='quality');
 return events.filter(event=>rpShopMetricAllowed(event.type,shop.channel||'all'));
}
function rpShopPeriodFacts(shop,start,end,qualityOnly=true){
 const period=riskShopPeriod(shop,riskRange(start,end)),events=rpShopPeriodEvents(shop,start,end,qualityOnly);
 const salesRows=sampleShopSpuSales(shop,start,end);
 const count=type=>events.filter(e=>e.type===type).length;
 const amount=type=>events.filter(e=>e.type===type).reduce((sum,e)=>sum+e.amount,0);
 return {gsv:period.gsv*10000,netSales:salesRows.reduce((sum,d)=>sum+d.sales-d.returned,0),violations:events.length,
  fine:amount('fine'),frozen:amount('frozen'),fineCount:count('fine'),frozenCount:count('frozen'),offShelf:count('offShelf'),drop:count('drop'),limited:count('limited')};
}
function rpShopFields(shop,qualityOnly=true){
 const w=riskRange(),now=rpShopPeriodFacts(shop,w.start,w.end,qualityOnly),before=rpShopPeriodFacts(shop,w.previousStart,w.previousEnd,qualityOnly),fields=[];
 const add=(key,name,value,raw,tone='',target='',targetTone='',hint='')=>fields.push({...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone});
 const comparison='上期取紧邻的等长区间；';
 const core=rpShopCoreFacts(shop,w.end);
 fields.push({...rpField('mainSpu','核心主营SPU',core.products.map(row=>row.product.name).join('、')||(core.available?'暂无达标产品':'暂无近30日数据'),'',rpShopCoreRule),core});
 for(const [key,name,count] of [['gsv','GSV',false],['netSales','销量',false],['violations','违规次数',true],['offShelf','链接下架',true],['drop','链接掉权',true],['limited','店铺限单',true]]){
  const change=count?rpCountComparison(now[key],before[key]):{target:rpQualityChange(now[key],before[key]),targetTone:rpQualityChangeTone(now[key],before[key])};
  add(key,name,key==='gsv'?rpQualityMoney(now[key]):count?fmt(now[key])+'次':formatSalesQuantity(now[key]),now[key],'rp-quality-normal',change.target,change.targetTone,comparison+(count?rpCountComparisonRuleText():rpComparisonRuleText()));
 }
 for(const [key,name] of [['fine','平台罚款'],['frozen','资金冻结']])add(key,name,rpQualityMoney(now[key]),now[key],rpQualityAmountTone(now[key]),now[key+'Count']+'次','rp-quality-gray',key==='frozen'?'期间冻结事件金额及次数，不作为实时冻结余额。':'期间平台罚款金额及次数。');
 add('sanctions','罚款＆冻结',rpQualityMoney(now.fine+now.frozen),now.fine+now.frozen,rpQualityAmountTone(now.fine+now.frozen),(now.fineCount+now.frozenCount)+'次','rp-quality-gray','平台罚款和冻结事件金额相加；下行是两类事件总次数。');
 fields.push(rpShopProblemField(shop,w.end,w.previousEnd));
 if(shop.channel!=='拼多多'){
  add('score','店铺分',Number.isFinite(shop.score)?fmt(shop.score,2):'—',shop.score,rpShopScoreTone(shop.channel,shop.score,shop),'','','结束日评分。'+rpShopScoreHint(shop.channel));
  for(const [key,name] of [['productScore','商品分'],['logisticsScore','物流分'],['serviceScore','服务分']])add(key,name,Number.isFinite(shop[key])?fmt(shop[key],2):'—',shop[key],'rp-quality-normal','','','结束日评分；未设置额外阈值。');
 }
 if(shop.channel==='拼多多'){
  const groups=rpPddLinkGroups(shop,w.end),end=w.end;
  for(const [key,name,tone] of [['redLinks','红灯链接数','red'],['yellowLinks','黄灯链接数','yellow']]){
   const count=!groups.all.length||(!groups[tone].length&&groups.unknown.length)?null:groups[tone].length;
   fields.push({...rpField(key,name,count===null?'--':count),sortValue:count,shopId:shop.id,linkTone:tone,linkEnd:end,unconfigured:!groups.all.length});
  }
 }
 return fields.filter(field=>rpShopMetricAllowed(field.key,shop.channel));
}

// 六项考核命中数：至少3项为红灯，1—2项为黄灯，0项不纳入异常链接。
function rpPddLinkGroups(shop,end){
 const all=sbPddLinks(shop,end);return {all,red:all.filter(l=>l.assessment==='red'),yellow:all.filter(l=>l.assessment==='yellow'),unknown:all.filter(l=>l.assessment==='unknown')};
}
function rpShopColumns(platform){
 const selected=Array.isArray(platform)?platform:[platform];
 const scoreKeys=['score','productScore','logisticsScore','serviceScore'];
 const keys=['mainSpu','gsv','netSales','violations',...rpShopMetricKeys(platform),...(!selected.includes('all')&&selected.some(platform=>platform!=='拼多多')?scoreKeys:[])];
 return selected.includes('拼多多')?[...keys,'redLinks','yellowLinks']:keys;
}
