// 高危店铺展示模型：期间流量、处罚事件与结束日评分分别取数。
const rpShopCardKeys=['gsv','netSales','sanctions','limited'];
const rpShopListKeys=['mainSpu','gsv','netSales','problemSpus','violations','fine','frozen','offShelf','drop','limited','score','productScore','logisticsScore','serviceScore'];
function rpShopScoreRule(platform){
 return {'抖音':[4.6,4.8],'快手':[4.4,4.7],'视频号':[4,4.5],'天猫':[4.6,4.8],'京东':[4.6,4.8],'拼多多':[4.7,4.8]}[platform];
}
function rpShopScoreTone(platform,score){
 const rule=rpShopScoreRule(platform);
 return !rule||!Number.isFinite(score)?'rp-quality-gray':(platform==='天猫'?score<rule[0]:score<=rule[0])?'rp-quality-red':score<rule[1]?'rp-quality-yellow':'rp-quality-green';
}
function rpShopScoreHint(platform){
 const rule=rpShopScoreRule(platform);
 return rule?platform+'店铺分'+(platform==='天猫'?'<':'≤')+rule[0]+'红色；'+(platform==='天猫'?'≥':'>')+rule[0]+'且<'+rule[1]+'黄色；≥'+rule[1]+'绿色。':'暂无评分规则。';
}
function rpShopProblemHit(product){
 const currentTarget=product.currentTarget??product.target,previousTarget=product.previousTarget??product.target;
 return [product.current,product.previous,currentTarget,previousTarget].every(Number.isFinite)&&product.current>currentTarget*1.05&&product.previous>previousTarget*1.05&&product.current>product.previous;
}
function rpShopTopSpu(rows){
 // 销量相同时按SPU编码稳定排序；没有有效销量时不指定主营商品。
 return rows.filter(r=>r.product&&Number.isFinite(r.sales)&&r.sales>0).sort((a,b)=>b.sales-a.sales||a.product.spuCode.localeCompare(b.product.spuCode))[0]?.product||null;
}
function rpShopMainSpu(shop,start=riskRange().start,end=riskRange().end){
 return rpShopTopSpu(sampleShopSpuSales(shop,start,end));
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
 return events;
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
 const comparison='上期取紧邻的等长区间；环比上涨绿色，跌幅≤10%灰色，跌幅>10%红色，持平灰色；上期缺失或为0且本期非0显示--；两期相同显示持平。';
 const main=rpShopMainSpu(shop,w.start,w.end);
 fields.push({...rpField('mainSpu','核心主营SPU',main?.name||'暂无销量数据','','按所选期间本店销量（未扣退货）最高的SPU自动识别；同销量按SPU编码排序。'),product:main});
 for(const [key,name,count] of [['gsv','GSV',false],['netSales','去退后销量',false],['violations','违规次数',true],['offShelf','链接下架',true],['drop','链接掉权',true],['limited','店铺限单',true]]){
  add(key,name,key==='gsv'?rpQualityMoney(now[key]):fmt(now[key])+(count?'次':''),now[key],'rp-quality-normal',rpQualityChange(now[key],before[key]),rpQualityChangeTone(now[key],before[key]),comparison+(count?'按期间处罚事件统计。':''));
 }
 for(const [key,name] of [['fine','平台罚款'],['frozen','资金冻结']])add(key,name,rpQualityMoney(now[key]),now[key],rpQualityAmountTone(now[key]),now[key+'Count']+'次','rp-quality-gray',key==='frozen'?'期间冻结事件金额及次数，不作为实时冻结余额。':'期间平台罚款金额及次数。');
 add('sanctions','罚款＆冻结',rpQualityMoney(now.fine+now.frozen),now.fine+now.frozen,rpQualityAmountTone(now.fine+now.frozen),(now.fineCount+now.frozenCount)+'次','rp-quality-gray','平台罚款和冻结事件金额相加；下行是两类事件总次数。');
 const problems=shop.returnProducts.filter(sbReturnRisk).length;
 add('problemSpus','店铺内问题SPU数',String(problems),problems,'rp-quality-normal','','','单品连续两期退货率均超过各自目标的105%，且本期高于上期；同一SPU只计一次。');
 add('score','店铺分',Number.isFinite(shop.score)?fmt(shop.score,2):'—',shop.score,rpShopScoreTone(shop.channel,shop.score),'','','结束日评分。'+rpShopScoreHint(shop.channel));
 for(const [key,name] of [['productScore','商品分'],['logisticsScore','物流分'],['serviceScore','服务分']])add(key,name,Number.isFinite(shop[key])?fmt(shop[key],2):'—',shop[key],'rp-quality-normal','','','结束日评分；未设置额外阈值。');
 return fields;
}
