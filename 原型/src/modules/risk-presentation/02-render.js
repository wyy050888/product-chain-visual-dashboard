// 最终六榜直接生成一次；旧版渲染链仍供原模块引用，不再逐层覆盖首页。
const rpRenderedCardRules=new WeakMap();
renderRisks=function(){
 return withPeriod('risk',()=>{
  const kinds=[0,1,2,3,4,6],rules=new Map();
  const classes={0:'qr-card',1:'br-shop-card rp-shop-card rf-card',2:'pr-shared-card rp-loss-card rf-card',3:'rp-stock-card rf-card',4:'rp-stock-card rf-card',6:'rp-return-card rf-card'};
  $('#riskrail').innerHTML=kinds.map(k=>{
   const rows=rpCardRows(k),filter=rpCardPlatformControl(k);
   rules.set(k,rpCardRuleSummary(k));
   return `<article data-rp-board="${k}" class="riskcard ${classes[k]||'rf-card'}">${rpCard(k,rows,filter)}</article>`;
  }).join('');
  for(const card of $$('#riskrail .riskcard'))rpRenderedCardRules.set(card,rules.get(Number(card.querySelector('[data-risk]').dataset.risk)));
  const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='6 大风险榜单 · TOP 6';
  decorateModule('risk');
  alignRiskCardFilters();pfMultiMount($('#riskrail'));
 });
};

// 标题规则使用逐条文本；浮层按标题、说明与列表渲染，不混入指标公式。
function rpCardRuleSummary(kind){
 const rules={
  0:{
   note:'按SPU、平台统计，以下条件满足任意一项即可入榜',
   pool:['发生品质相关的平台罚款、资金冻结、链接下架或掉权','销量≥100，且总退环比增长值＞3个百分点','总进线率环比增长值＞20个百分点；上期无有效销量时不以此项入榜'],
   sort:['风险优先级：资金冻结 → 平台罚款 → 产品退货率超标；其他风险沿用原有次序，命中多项取最高优先级','同优先级，风险命中数量从多到少','再按对应风险数值从高到低：冻结金额、罚款金额、相关链接近30天GSV、总退环比增长值、差评率']
  },
  1:{
   note:'按店铺统计，以下条件满足任意一项即可入榜',
   pool:['店铺评分异常，且品质违规处罚≥2次','品质违规罚款金额≥5000元','同一SPU最近两周实际总退率均高于各自目标总退率超过5个百分点，且连续恶化：本周总退率＞上周总退率＞上上周总退率','存在资金冻结','拼多多任一核心链接的六项品质指标中，至少三项＞30%'],
   detail:'六项品质指标：三级类目、主营类目下的品质退款率、品质求助平台率、品质文本情感分\n拼多多核心链接为一类目标配置中拼多多平台的核心链接',
   sort:['风险优先级：资金冻结 → 平台罚款 → 产品退货率超标 → 评分红灯 → 评分黄灯 → 销量下降，命中多项取最高优先级','同优先级，风险命中数量从多到少','评分风险店铺中，核心店铺优先，再按旗舰店 → 专卖店 → 自营店 → C店 → 其他店排序','再按对应风险数值排序：冻结及罚款金额从高到低、评分从低到高、销量降幅从高到低']
  },
  2:{
   note:'按所选期间、平台统计，选择全平台时按公司整体口径计算',
   pool:['净利润率＜0'],
   detail:'利润率取数智罗盘产品业绩，净利润率＝利润率－10个百分点',
   sort:['亏损金额从低到高，亏损越大越靠前，例如－10万排在－5万前','亏损金额相同，净利润率从高到低']
  },
  3:{
   note:'按公司SPU统计，取最新库存快照；公司总库存＞0，且满足以下任意一项即可入榜，库存数量及金额不重复累计',
   pool:['总退＞55%','已收退＞30%','存在呆滞库存','利润率＜10%','当月下架、冻结合计≥3次'],
   sort:['风险命中数量从多到少','命中数量相同，按违规红灯 → 利润率＜10% → 总退＞55% → 已收退＞30% → 呆滞库存排序，命中多项取最高优先级','仍相同时，保持原顺序']
  },
  4:{
   note:'按SKU统计，展示SKU名称及编码；夏季品、冬季品、四季品分别入榜、独立排序',
   pool:['SKU存在库龄≥60天的库存'],
   sort:['呆滞库存金额从高到低','金额相同，呆滞最高库龄从高到低']
  },
  6:{
   note:'按SPU、平台统计，以下条件满足任意一项即可入榜',
   pool:['总退环比增长值＞3个百分点','已收退环比增长值＞2个百分点'],
   detail:'环比增长值＝本期退货率－上期退货率；等于上述阈值不触发',
   sort:['总退偏离幅度从大到小','总退偏离幅度相同，已收退偏离幅度从大到小','前两项均相同，销量从高到低'],
   sortDetail:'总退偏离幅度＝实际总退率－目标总退率；已收退偏离幅度＝实际已收退率－目标已收退率。销量取未扣退货的销售件数'
  }
 };
 const {note,pool,detail,sort,sortDetail}=rules[kind];
 return '入榜条件\n'+note+'\n'+pool.map(s=>'• '+s).join('\n')+(detail?'\n'+detail:'')+'\n\n排序规则\n'+sort.map((s,i)=>(i+1)+'. '+s).join('\n')+(sortDetail?'\n'+sortDetail:'');
}
