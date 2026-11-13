// 各平台仅按现有评分、业绩和违规字段分析；不是最新官方规则。
const sdPlatformPlaybooks={
 '抖音':{focus:'按违规对象、处罚状态、情节级别及更新时间核对限制影响，不能从汇总业绩推断某场直播或投放失效。',deliverable:'按违规对象提交限制状态、整改结果及复查日期。'},
 '快手':{focus:'按违规场景、处置内容、严重程度及申诉和整改状态排定处理顺序，不推断主播话术或用户信任变化。',deliverable:'逐项整理违规场景、处置结果及申诉和整改状态。'},
 '视频号':{focus:'核对违规类型、处罚方式、违规说明和已有信用变更记录，不从成交变化推断私域或内容效果。',deliverable:'按违规对象整理处置结果、信用变更及复查日期；岗位资料缺失时不虚构负责人。'},
 '天猫':{focus:'按违规类型、违规影响、严重程度及已有扣分记录核对，不把评分低或成交下降直接归因于推广。',deliverable:'店铺策略跟进违规影响及整改，店铺推广观察整改前后业绩；不预设投放调整。'},
 '京东':{focus:'按违约单、违规原因、预警/处置起止时间及实际申诉截止日期核对，不把所有履约问题归责店铺。',deliverable:'按违约单整理处置状态、实际期限和整改结果，由店铺策略牵头核对。'},
 '拼多多':{focus:'按违规类型、违规影响及已有赔付金额核对，不以链接异常或退款汇总认定买家恶意、商品缺陷或低价竞争。',deliverable:'店铺策略核对违规影响及赔付记录，提交整改结果；金额与次数分别列示。'}
};
function sdPromptFor(platform){return '当前平台：'+platform+'。仅应用该平台对应条款。\n\n'+dashboardAiPrompts.shop;}
function sdScoreFacts(shop){
 if(shop.channel==='拼多多')return {weakest:'',text:'',low:false};
 const fields=[['商品分',shop.productScore],['物流分',shop.logisticsScore],['服务分',shop.serviceScore]].filter(([,n])=>Number.isFinite(n));
 const minimum=fields.length?Math.min(...fields.map(([,n])=>n)):null;
 const weakest=fields.filter(([,n])=>n===minimum).map(([label])=>label).join('、');
 return {weakest:shop.channel==='视频号'?'':weakest,text:'店铺分'+(Number.isFinite(shop.score)?fmt(shop.score,2):'—')+'；'+fields.map(([label,n])=>label+fmt(n,2)).join('、')+'。',low:shop.channel!=='视频号'&&['rp-quality-red','rp-quality-yellow'].includes(rpShopScoreTone(shop.channel,shop.score,shop))};
}
function sdDiagnosis(m,state){
 const {shop,current:c,previous:p}=m,recent=m.recent||c,recentReturn=m.recent?m.recent.returnRate:m.returnRate,score=sdScoreFacts(shop),links=shop.channel==='拼多多'?sdPddAssessment(shop,(m.range||state).end):null;
 const down=Number.isFinite(p.netSales)&&recent.netSales<p.netSales,hasSales=recent.gsv>0||recent.netSales>0;
 const returnUp=Number.isFinite(recentReturn)&&Number.isFinite(m.previousReturnRate)&&recentReturn>m.previousReturnRate;
 const restrictions=c.frozenCount+c.offShelf+c.drop+c.limited,quality=m.events.filter(e=>e.reasonType==='quality').length;
 const rows=[
  links?['核心链接',links.text]:['评分','最新可用评分：'+score.text+(shop.channel==='视频号'?'评分仅展示原值，不作红黄绿或评分风险判断。':(score.low?'店铺分未达到本平台配置的绿色区间。':'店铺分'+(Number.isFinite(shop.score)?'达到本平台配置的绿色区间。':'暂无有效值。')))+(score.weakest?'同量纲分项中最低为'+score.weakest+'，仅作为排查方向。':'')],
  ['业绩','近30日GSV '+rpQualityChange(recent.gsv,p.gsv)+'，去退后销量'+rpQualityChange(recent.netSales,p.netSales)+'。'+(returnUp?'总退由'+upPercent(m.previousReturnRate)+'升至'+upPercent(recentReturn)+'，需关注退货对有效成交的影响。':down?'有效成交回落，现有业绩数据不能单独证明流量或投放问题。':'结合有效成交判断规模变化，不直接据此判断投放效率。')],
  ['违规','历史累计'+c.violations+'次，品质原因'+quality+'次、其他原因'+(m.events.length-quality)+'次；罚款'+pfMoneyYuan(c.fine)+'，冻结事件金额'+pfMoneyYuan(c.frozen)+'。'+(restrictions?'下架、掉权、限单及冻结须按记录核实当前状态，不能按历史次数认定仍受限。':'未见上述限制事件，不等于其他经营环节均正常。')]
 ];
 const owner='店铺负责人',actions=[],leadActions=[];
 if(!hasSales)leadActions.push('核对业绩记录范围及店铺经营状态，确认后再提出新增投入建议。');
 if(c.violations)leadActions.push('逐项确认违规对象、处置状态和实际期限，处理未解除的限制，回填整改或申诉结果。');
 if(quality)actions.push('品质中心：复核品质违规的涉及商品和整改状态，对未闭环事项明确整改要求并提交结论。');
 const logistics=m.events.filter(e=>e.reasonType==='logistics');
 if(logistics.length)actions.push('发货部：逐项核对履约类违规的对象、原因及状态，提交纠正措施和处置结果。');
 if(m.events.some(e=>['service','aftersales'].includes(e.reasonType)))actions.push('用户中心：核对服务、售后类违规事项，提交纠正措施及处理结果。');
 if(links&&(!links.total||links.unknown))leadActions.push('核对核心链接配置及缺失考核数据，不把未配置或待补数据视为正常。');
 if(links?.red||links?.yellow)leadActions.push('逐条核对'+links.red+'条红灯链接、'+links.yellow+'条黄灯链接的考核原值、已有原因及整改状态，记录同口径复查结果。');
 if(score.low)leadActions.push('复核'+(score.weakest||'店铺评分')+'，与已有违规原因交叉核对，列明需改善分项及复查结果。');
 if(down||returnUp)leadActions.push('按店内SPU列出重点商品，复查整改前后的去退后销量及总退，提出后续投入建议。');
 if(!leadActions.length&&!actions.length)leadActions.push('按相同口径复查'+(links?'核心链接考核':shop.channel==='视频号'?'经营表现':'评分')+'、去退后销量及新增违规，明确恶化后再安排整改。');
 if(leadActions.length)actions.unshift(owner+'：'+leadActions.join(''));
 const summary=!hasSales?'当前无有效成交记录，先核对经营状态，再决定新增投入。':restrictions&&down?'优先核实限制状态及整改进度，暂缓扩大经营投入。':c.violations?'优先处理违规事项，经营调整以整改结果和有效成交为依据。':links?.red?'优先复核核心链接异常，经营调整以整改结果和有效成交为依据。':score.low?'维持经营，优先改善评分短板，新增投入结合整改和成交表现决定。':down||returnUp?'优先核对有效成交与退货变化，暂缓无依据的投入扩张。':'可维持现有经营节奏，持续监控'+(links?'核心链接考核':shop.channel==='视频号'?'经营表现':'评分')+'、有效成交及违规变化。';
 return {summary,context:'累计GSV '+pfMoneyYuan(c.gsv)+'，累计去退后销量'+formatSalesQuantity(c.netSales)+'；近30日GSV '+pfMoneyYuan(recent.gsv)+'，去退后销量'+formatSalesQuantity(recent.netSales)+'。',dimensions:rows,actions:actions.join('\n'),owner,range:m.range||{start:state.start,end:state.end}};
}
