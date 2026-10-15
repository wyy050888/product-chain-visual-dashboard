// 展示字段只读取统一台账；不改各榜入池、排序和业务阈值。
const rpState={shopType:'all'};
const rpTitles={0:'品质风险榜',1:'高危店铺榜',2:'亏损产品榜',3:'库存风险榜',4:'呆滞产品榜',6:'退货恶化榜'};
const rpCardKeys={0:['gsv','return','received','sanctions','contact'],1:['gsv','netSales','sanctions','limited','score'],
  2:['gsv','margin','loss','return','total'],3:['gsv','margin','return','total','turn'],
  4:['staleUnits','staleValue','age','dailyNet15'],6:['gsv','netSales','margin','return','received']};
function rpField(key,name,value,tone='',hint='',target=''){return{key,name,value:String(value??'—'),tone,hint,target}}
function rpCount(n){return Number.isFinite(n)?fmt(n)+'件':'—'}
function rpTone(hit){return hit===null?'':hit?'red':'green'}
function rpGrowth(current,previous){const value=rpQualityChangeValue(current,previous);return value===null?'--':Math.round(Math.abs(value)*10)===0?'持平':rrSigned(value,1,'%')}
function rpShopType(r){return /旗舰店/.test(r.name)||r.shopType==='旗舰店'?'旗舰店':/自营/.test(r.name)||r.shopType==='自营店'?'自营店':'其他店铺'}
function rpShopTypes(platform){const types=sbAllShops().filter(r=>platform==='all'||r.channel===platform).map(rpShopType);return ['旗舰店','自营店','其他店铺'].filter(t=>types.includes(t))}
function rpShopTypeOptions(platform){const types=rpShopTypes(platform);if(!types.includes(rpState.shopType))rpState.shopType='all';return ['all',...types].map(t=>`<option value="${t}" ${t===rpState.shopType?'selected':''}>${t==='all'?'全部店铺类型':t}</option>`).join('')}
function rpProduct(r){const p=upIdentity(r);return p?upProduct(p):null}
function rpFieldMap(k,r,qualityOnly=true){
  const w=upWindow(),p=upIdentity(r),platform=k===0?r.platform:k===6?r.channel:r.metricPlatform||'all';
  const s=p?upSummary(p,w.start,w.end,platform):null;
  const prev=p?upSummary(p,shiftDate(w.start,-aiFlowDayDiff(w.start,w.end)-1),shiftDate(w.start,-1),platform):null;
  const raw={},rows=[],put=(...args)=>rows.push(rpField(...args));
  if(k===1)return rpShopFields(r,qualityOnly);
  if(k===2)return rpLossFields(r,s,prev);
  if(k===6)return rpReturnFields(r,s,prev);
  if(k===3||k===4)return rpStockFields(k,r,s,prev);
  const quality=k===0?r: k===6?qrObservation(upProduct(p),r.channel,w.start,w.end):null;
  if(quality){const m=quality.monthly,events=m.events;Object.assign(raw,{fine:m.fine,frozen:m.frozen,fineAmount:m.fine,frozenAmount:m.frozen,fineCount:events.filter(e=>e.type==='罚款').length,frozenCount:events.filter(e=>e.type==='资金冻结').length,down:m.offShelf+(m.dropCount||0)});put('fine','平台罚款',pfMoneyYuan(m.fine)+'/'+events.filter(e=>e.type==='罚款').length+'次',rpTone(m.fine>0),'所选期间的平台罚款事件次数及金额。');put('frozen','资金冻结',pfMoneyYuan(m.frozen)+'/'+events.filter(e=>e.type==='资金冻结').length+'次',rpTone(m.frozen>0),'所选期间冻结事件次数及金额；缺少解冻台账，不作为实时冻结余额。');put('fineCount','罚款次数',events.filter(e=>e.type==='罚款').length+'次');put('fineAmount','罚款金额',pfMoneyYuan(m.fine),rpTone(m.fine>0));put('frozenCount','冻结次数',events.filter(e=>e.type==='资金冻结').length+'次');put('frozenAmount','冻结金额',pfMoneyYuan(m.frozen),rpTone(m.frozen>0));put('down','链接下架／掉权次数',(m.offShelf+(m.dropCount||0))+'次',rpTone(m.offShelf+(m.dropCount||0)>0),'所选期间下架与掉权事件次数合计，不增加关联链接清单。');}
  if(s){
    const totalTarget=quality?quality.monthly.target:k===2?null:r.returnTarget;
    const receivedTarget=(k===0||k===6)?8:null;
    put('return','总退货率',upPercent(s.returnRate),quality?rpTone(quality.monthly.returnHit):'','同期总退件数÷销量；目标按SPU和平台设置。'+(totalTarget===null?'':'当前样例目标 '+upPercent(totalTarget)+'；偏差为实际减目标。'),totalTarget===null?'':`偏差 ${s.returnRate===null?'—':rrSigned(s.returnRate-totalTarget,1,'%')}`);
    put('received','已收退货率',upPercent(s.receivedRate),receivedTarget===null?'':rpTone(s.receivedRate===null?null:s.receivedRate>receivedTarget),'消费者签收后发生的退货件数÷同期销量。'+(receivedTarget===null?'':'当前样例目标 '+upPercent(receivedTarget)+'；正式目标台账待接入。'),receivedTarget===null?'':`偏差 ${s.receivedRate===null?'—':rrSigned(s.receivedRate-receivedTarget,1,'%')}`);
    put('contact','进线率',upPercent(s.contactRate),quality?rpTone(quality.monthly.contactHit):'','问题进线数÷同期销量；恶化判定与品质榜共用台账。');put('bad','差评率',upPercent(s.badRate),'','差评数÷有效评价数；无评价时不计算。');
    put('returnTarget','总退货率目标',totalTarget===null?'按平台查看':upPercent(totalTarget));put('receivedTarget','已收退货率目标',receivedTarget===null?'按平台查看':upPercent(receivedTarget));
    put('returnGrowth','总退货率环比',rpGrowth(s.returnRate,prev.returnRate),'','与上期等长区间的总退货率比较；上期为0时不计算百分比。');put('receivedGrowth','已收退货率环比',rpGrowth(s.receivedRate,prev.receivedRate),'','比较两期已收退货率；与已收退件数环比区分。');put('contactGrowth','进线率环比',rpGrowth(s.contactRate,prev.contactRate));
    put('sales','销量',rpCount(s.sales));put('returned','总退件数',rpCount(s.returned));put('receivedUnits','已收退件数',rpCount(s.received));put('contacts','问题进线数',fmt(s.contacts));
    const net=k===2?upNetEstimate(s):{profitCents:s.profitCents,profitRate:s.profitRate};put('gsv','GSV',upMoney(s.gsvCents));put('profit',k===2?'测算净利额':'利润额',upMoney(net.profitCents),net.profitCents<0?'red':'');put('margin',k===2?'测算净利率':'利润率',upPercent(net.profitRate),net.profitRate!==null&&net.profitRate<10?'red':'',k===2?'毛利率减10个百分点；原型按同一GSV基数测算，正式毛利率分母待映射。':'利润额÷GSV；无净销售额不计算。');put('loss',k===2?'测算净亏损':'亏损金额',upMoney(Math.min(0,net.profitCents)),net.profitCents<0?'red':'');put('refund','退款金额',upMoney(s.refundCents));
    put('returnGap','总退超目标幅度',totalTarget===null||s.returnRate===null?'按平台查看':rrSigned(s.returnRate-totalTarget,1,'%'));put('receivedGap','已收退超目标幅度',receivedTarget===null||s.receivedRate===null?'按平台查看':rrSigned(s.receivedRate-receivedTarget,1,'%'));
    put('previousReturn','上期总退货率',upPercent(prev.returnRate));put('previousReceived','上期已收退货率',upPercent(prev.receivedRate));put('previousContact','上期进线率',upPercent(prev.contactRate));
    const growth=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?(a-b)/b*100:null;
    Object.assign(raw,{return:s.returnRate,received:s.receivedRate,contact:s.contactRate,bad:s.badRate,returnTarget:totalTarget,receivedTarget,
      returnGrowth:growth(s.returnRate,prev.returnRate),receivedGrowth:growth(s.receivedRate,prev.receivedRate),contactGrowth:growth(s.contactRate,prev.contactRate),
      sales:s.sales,returned:s.returned,receivedUnits:s.received,contacts:s.contacts,gsv:s.gsvCents,profit:net.profitCents,margin:net.profitRate,loss:Math.min(0,net.profitCents),refund:s.refundCents,
      returnGap:Number.isFinite(totalTarget)&&Number.isFinite(s.returnRate)?s.returnRate-totalTarget:null,receivedGap:Number.isFinite(receivedTarget)&&Number.isFinite(s.receivedRate)?s.receivedRate-receivedTarget:null,
      previousReturn:prev.returnRate,previousReceived:prev.receivedRate,previousContact:prev.contactRate});

  }
  if(k===3||k===4){const stock=k===3?r:upPlatformStockFacts(r,platform),recent=upSummary(p,shiftDate(w.end,-14),w.end,platform);const ratio=stock.goodsValueCents?stock.staleValueCents/stock.goodsValueCents*100:null;
    Object.assign(raw,{total:stock.totalUnits,value:stock.goodsValueCents,turn:r.turn,coverage:stock.coverage,coverage15:stock.slowCoverage,staleRatio:ratio,staleValue:stock.staleValueCents,
      staleUnits:stock.staleUnits,warehouse:stock.warehouse,factory:stock.factory,undelivered:stock.undelivered,price:stock.financePriceCents/100,sales15:recent.sales,age:null});

    put('total',k===3?'高危品总库存':'总库存',rpCount(stock.totalUnits),'','仓内＋工厂＋新机未交付，三类库存互不重复。');put('value','高危品货值',upMoney(stock.goodsValueCents),'','总库存×含税含品牌财务价。');
    put('turn','库存周转率',r.turn===null?'—':fmt(r.turn,2)+(k===3?'次/30日':'次/期间'),'','期间出库成本÷期间平均库存成本。');put('coverage','可售天数',stock.coverage===null?'无动销':fmt(stock.coverage,1)+'天','','公司仓内库存÷所选平台在当前周期的日均销量；未分配平台专属库存。');
    put('coverage15','可售天数（近15天）',stock.slowCoverage===null?'无动销':fmt(stock.slowCoverage,1)+'天',stock.slow?'red':'','公司仓内库存÷所选平台近15日日均销量；只判断有动销产品，达到60天纳入滞销，不作为平台专属库存。');
    put('staleRatio','呆滞占比',upPercent(ratio),'','超库龄货值÷总库存货值。');put('staleValue','滞销金额',upMoney(stock.staleValueCents),'red','只计算超库龄部分。');put('staleUnits','超库龄库存数',rpCount(stock.staleUnits),'','按原超库龄货值比例折算的样例数量，实际数量需批次库龄台账。');
    put('warehouse','仓内库存',rpCount(stock.warehouse));put('factory','工厂库存',rpCount(stock.factory));put('undelivered','新机未交付',rpCount(stock.undelivered));put('price','财务价',pfMoneyYuan(stock.financePriceCents/100)+'/件');put('sales15','近15天销量',rpCount(recent.sales));put('attribute','产品属性',r.attribute);put('age','最大库龄','待接入','','未提供真实批次及库龄，不用低动销天数代替库龄。');put('causes','命中风险',k===3?r.reasons.map(irReasonText).join('、'):'动销产品可售天数≥60天','');
  }
  const fields=rows.map(f=>({...f,sortValue:raw[f.key],...(k===6&&['returnGrowth','receivedGrowth','contactGrowth'].includes(f.key)?{tone:rpComparisonTone(raw[f.key]),hint:f.hint+'上涨绿色，跌幅≤10%灰色，跌幅>10%红色；持平和无可比数据灰色。'}:{})}));
  return k===0?rpQualityFields(r,fields,s,prev,qualityOnly):fields;
}
function rpFields(k,r,keys){const fields=rpFieldMap(k,r);return keys.map(key=>fields.find(f=>f.key===key)).filter(Boolean)}
function rpCauses(k,r){return k===3?r.reasons.map(irReasonText):k===4?['动销产品可售天数≥60天']:k===2?[(r.metricPlatform&&r.metricPlatform!=='all'?r.metricPlatform:'全公司')+'测算净利为负']:r.risks||[]}
function rpRules(k){return k===0?qrbRules():k===1?sbRules():k===3?irRules():k===4?'仅判断动销产品：仓内库存＞0，近15日销量＞0，仓内库存÷近15日日均销量≥60天；金额只计算超库龄部分。':k===2?'按SPU汇总所选平台同期业绩，全平台为公司汇总；毛利率减10个百分点后测算净利为负入榜，按测算净亏损绝对金额排序；原型基数为GSV，正式分母待映射。':'退货榜执行文件现行条件：总退超目标5、已收退超目标2、下架≥2、单笔罚款≥5000或品质处罚≥2次；违规优先，再按罚款金额、GSV、目标偏差排序。偏差单位、违规单独入榜范围待补充。'}
