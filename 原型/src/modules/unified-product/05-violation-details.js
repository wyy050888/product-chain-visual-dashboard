// 六平台按参考表头独立配置，不包含红绿灯列。
const upViolationColumns={
 '抖音':[['店铺名称','shop'],['违规对象','object'],['违规编号','number'],['处罚状态','status'],['违规原因','reason'],['处罚方式','action'],['情节级别','severity'],['违规时间','occurredAt'],['更新时间','updatedAt']],
 '快手':[['店铺名称','shop'],['违规场景','reason'],['违规编号','number'],['处置内容','action'],['处罚状态','status'],['申诉和整改状态','appeal'],['处置详情','action'],['严重程度','severity'],['违规时间','occurredAt'],['更新时间','updatedAt']],
 '视频号':[['店铺名称','shop'],['来源','source'],['违规对象','object'],['违规编号','number'],['违规类型','reason'],['处罚状态','status'],['处罚方式','action'],['违规说明','description'],['整改建议','advice'],['信用变更','credit'],['违规时间','occurredAt'],['更新时间','updatedAt']],
 '天猫':[['店铺名称','shop'],['来源','source'],['违规对象','object'],['违规编号','number'],['处罚状态','status'],['违规类型','reason'],['违规影响','action'],['严重程度','severity'],['扣分','deduction'],['违规时间','occurredAt'],['更新时间','updatedAt']],
 '京东':[['店铺名称','shop'],['来源','source'],['单号','number'],['主体/订单号','subject'],['状态','status'],['违规原因','reason'],['处置方式','action'],['违规程度','severity'],['预警/处置起止时间','period'],['开单日期','occurredAt'],['申诉截止日期','appealDeadline'],['更新时间','updatedAt']],
 '拼多多':[['店铺名称','shop'],['来源','source'],['违规编号','number'],['商品信息','object'],['状态','status'],['违规类型','reason'],['赔付金额','compensation'],['整改建议','advice'],['违规通知时间','occurredAt'],['限制起止时间','period'],['更新时间','updatedAt']]
};
// 台账提供日期、类型、金额；以下补充字段仅为稳定的原型样例，不增加事件或改动统计。
function upViolationShop(product,event){
 const shop=sampleShopRows().find(s=>event.shopId?String(s.shopId)===String(event.shopId):s.brand===product.brand&&s.channel===event.platform);
 // 缺少店铺主数据时，演示ID按品牌和平台固定，不随产品、事件或筛选日期变化。
 const seed=[...product.brand+'|'+event.platform].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 return {shop:event.shopName||shop?.name||product.brand+'官方旗舰店',shopId:event.shopId||shop?.shopId||String(100000000+seed%900000000)};
}
function upViolationShopCell(row){
 return `<span class="up-violation-shop">${esc(row.shop)}<small>店铺ID：${esc(row.shopId??'—')}</small></span>`;
}
function upViolationDetail(product,event){
 const seed=[...product.spuId+event.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0),time=' '+String(9+seed%9).padStart(2,'0')+':'+String(seed%60).padStart(2,'0')+':00';
 const occurredAt=event.date+time,amount=Number(event.amount)||0;
 // 商品链接标题与SPU名称独立；优先读取违规记录中的链接快照，缺失时使用平台样例。
 const linkId=qrbViolationLinkId(product,event.platform,event);
 const sampleTitles={
  '抖音':`【${product.brand}品牌直营】${product.name} 官方旗舰店`,
  '快手':`${product.name} ${product.brand}官方直营精选`,
  '视频号':`【官方精选】${product.name} ${product.brand}直营`,
  '天猫':`${product.brand}官方旗舰店 ${product.name} 品牌正品`,
  '京东':`${product.name} ${product.brand}品牌旗舰店在售款`,
  '拼多多':`【品牌直供】${product.name} 官方店精选款`
 };
 const linkTitle=event.linkTitle??sampleTitles[event.platform]??'商品链接标题待补充';
 const action=event.type==='罚款'?'罚款 '+pfMoneyYuan(amount):event.type==='资金冻结'?'冻结资金 '+pfMoneyYuan(amount):event.type==='下架'?'商品下架':'限制商品搜索曝光';
 const reason=event.reason||(event.reasonType==='quality'?'商品品质不符合平台要求':'商品信息不规范');
 return {...upViolationShop(product,event),linkTitle,linkId,object:linkTitle+'\n链接id：'+linkId,number:'V'+event.date.replaceAll('-','')+String(seed).padStart(10,'0'),
  status:({'抖音':'已处罚','快手':'已生效','视频号':'待处理','天猫':'处罚中','京东':'待处理','拼多多':'平台处理中'})[event.platform],
  reason,action,severity:amount>=5000?'严重':'一般',occurredAt,updatedAt:event.date+' 18:30:00',
  source:({'京东':'违约单','拼多多':'店铺违规','视频号':'违规记录','天猫':'违规'})[event.platform]||'平台违规',
  appeal:'待申诉 / 待整改',description:reason+'，'+action,advice:event.reasonType==='quality'?'核查对应批次质量并提交整改材料':'核查商品信息及平台规则，提交整改材料',
  credit:'—',deduction:'—',subject:product.spuCode,period:['下架','掉权','资金冻结'].includes(event.type)?occurredAt+' 起':'—',
  appealDeadline:shiftDate(event.date,7)+' 23:59:59',compensation:event.type==='罚款'?pfMoneyYuan(amount):'—'};
}
