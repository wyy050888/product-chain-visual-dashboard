// 最终六榜直接生成一次；旧版渲染链仍供原模块引用，不再逐层覆盖首页。
const rpRenderedCardRules=new WeakMap();
// 分区共用铭牌结构；装饰不进入标题文本或无障碍名称。
function rpGroupHeading(title,id=''){
 return `<div class="rp-group-heading"><span class="rp-group-wing" aria-hidden="true"></span><h3 class="rp-group-title"${id?' id="'+id+'"':''}><span class="rp-group-title-text">${esc(title)}</span></h3><span class="rp-group-wing rp-group-wing-right" aria-hidden="true"></span></div>`;
}
function rpMountLossHeading(){
 const head=$('#riskrail>.rp-loss-wide .rhead'),title=head.querySelector('h3'),template=document.createElement('template');
 template.innerHTML=rpGroupHeading(rpTitles[2]);
 const heading=template.content.firstElementChild,label=document.createElement('span');label.className='rp-group-title-text';
 label.append(...title.childNodes);title.append(label);title.classList.add('rp-group-title');
 heading.querySelector('h3').replaceWith(title);head.prepend(heading);
 rpMountLossTable(head.closest('.rp-loss-wide'));
}
renderRisks=function(changedKinds=null){
 return rpWithCardRows(()=>withPeriod('risk',()=>{
  rpObserveWarningBoards();
  const rail=$('#riskrail'),partial=Array.isArray(changedKinds)&&rail.querySelector('.rp-board-group');
  const qualityKinds=[0,6,8,1];
  const kinds=partial?[...new Set(changedKinds)]:[...qualityKinds,4,3,2],rules=new Map(),cards=new Map();
  const classes={0:'qr-card rp-platform-board',1:'br-shop-card rp-shop-card rp-shop-board rf-card',2:'pr-shared-card rp-loss-card rf-card',3:'rp-stock-card rf-card',4:'rp-stock-card rf-card',6:'rp-return-card rp-platform-board rf-card',8:'rp-return-card rp-platform-board rf-card'};
  for(const k of kinds)rpWithBoardPeriod(k,()=>{
   const rows=rpCardRows(k),filter=rpCardPlatformControl(k);
   rules.set(k,rpCardRuleSummary(k));
   cards.set(k,`<article data-rp-board="${k}" class="riskcard ${classes[k]||'rf-card'}${k===2?' rp-loss-wide':''}">${rpCard(k,rows,filter)}</article>`);
  });
  const group=(key,title,kinds)=>`<section class="rp-board-group rp-board-group-${key}" aria-labelledby="rp-group-${key}">${rpGroupHeading(title,'rp-group-'+key)}<div class="rp-group-grid">${kinds.map(k=>cards.get(k)).join('')}</div></section>`;
  if(partial){
   // 季品只更新本榜；品质平台只更新联动三榜，其他榜保留数据、节点和滚动位置。
   for(const k of kinds){const current=rail.querySelector('[data-rp-board="'+k+'"]');if(current)current.outerHTML=cards.get(k)}
  }else rail.innerHTML=group('quality','品质风险榜',qualityKinds)+group('inventory','库存风险榜',[4,3])+cards.get(2);
  for(const card of $$('#riskrail .riskcard')){const k=Number(card.querySelector('[data-risk]').dataset.risk);if(rules.has(k))rpRenderedCardRules.set(card,rules.get(k))}
  const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='7 大风险榜单 · TOP 6';
  rpClearSharedDateControls();decorateModule('risk');
  rpMountGroupNavigation();alignRiskCardFilters();if(kinds.includes(2))rpMountLossHeading();rpMountBoardDateControls(rail);pfMultiMount(rail);
 }));
};

// 两种退货偏差共用公式，表格条件直接读取全局业务规则。
function rpCardReturnRuleData(kind='return'){
 const band=brcBands.find(row=>row.id==='return.'+kind);
 return {formula:'偏差＝实际－目标（%）',rows:brcBandRows(band.id).map((row,index)=>({...row,text:brcDescribe(band.keys[index],'').replace('数值','偏差')}))};
}
function rpCardReturnColorRule(){
 const total=rpCardReturnRuleData(),received=rpCardReturnRuleData('received'),names={red:'红灯',yellow:'黄灯',green:'绿灯'};
 return [total.formula,...['red','yellow','green'].map(tone=>names[tone]+'：总退 '+total.rows.find(row=>row.tone===tone).text+'；已收退 '+received.rows.find(row=>row.tone===tone).text)].join('\n');
}
function rpRenderReturnColorRules(host){
 const total=rpCardReturnRuleData(),received=rpCardReturnRuleData('received'),names={red:'红灯',yellow:'黄灯',green:'绿灯'};
 const append=(parent,tag,text,className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node};
 append(host,'div',total.formula,'rp-return-rule-formula');
 const table=append(host,'table','','rp-return-rule-table'),head=append(append(table,'thead',''),'tr',''),body=append(table,'tbody','');
 table.setAttribute('aria-label','总退与已收退红黄绿判定条件');
 for(const text of ['灯色','总退偏差','已收退偏差'])append(head,'th',text).scope='col';
 for(const tone of ['red','yellow','green']){
  const row=append(body,'tr',''),label=append(row,'th',names[tone]);label.scope='row';label.dataset.tone=tone;
  for(const rule of [total,received])append(row,'td',rule.rows.find(condition=>condition.tone===tone)?.text||'—');
 }
}
// 标题规则使用逐条文本；浮层按标题、说明与列表渲染。
function rpCardRuleSummary(kind){
 if(kind===3)return rpShortageRule();
 if(kind===4)return rpStagnantRule();
 const rules={
  0:{
   note:'按单一SPU全平台汇总统计，同一SPU仅排名一次。卡片仅展示所选平台中本期命中违规的平台。',
   pool:['发生品质/质量相关处罚，含资金冻结、平台罚款、链接下架、链接掉权'],
   sort:['按该SPU全平台上述四类违规总次数从高到低排序','违规总次数相同，按该SPU近30天GSV从高到低排序']
  },
  1:{
   note:'按店铺统计，以下条件满足任意一项即可入榜',
   pool:['店铺评分红灯，且品质违规处罚'+brcDescribe('shops.penalties')+'\n  • 抖音、快手、天猫、京东：按本平台店铺分红灯规则判定\n  • 拼多多：任一核心链接的六项监控指标中，异常项数'+brcDescribe('shops.pddCount')+'，等同于店铺评分红灯\n    六项监控指标：三级分类、主营链群下的品质退款率、品质求助平台率、品质文本情感分；单项异常条件：指标原值'+brcDescribe('shops.pddValue'),'品质违规罚款金额'+brcDescribe('shops.fine')+'',rpShopReturnRule(),'存在资金冻结'],
   sort:['风险优先级：资金冻结 → 平台罚款 → 产品退货率超标 → 评分红灯 → 评分黄灯，命中多项取最高优先级','同优先级，风险命中数量从多到少','评分风险店铺中，核心店铺优先，再按旗舰店／POP旗舰店 → 专卖店／POP专卖店 → 自营 → 无分类排序','再按对应风险数值排序：冻结及罚款金额从高到低、评分从低到高']
  },
  2:{
   note:'按所选期间、平台统计，选择全平台时按公司整体口径计算',
   pool:['净利润率＜0'],
   detail:'利润率取数智罗盘产品业绩，净利润率＝利润率－'+brcNumber('finance.deduction')+'%',
   sort:['亏损金额从低到高，亏损越大越靠前，例如－10万排在－5万前','亏损金额相同，净利润率从高到低']
  },
  6:{
   note:'按SPU、平台统计，按以下条件组入榜。卡片仅展开所选平台中命中退货恶化的平台。',
   pool:[brcResultText('quality-worsening')],
   detail:'① 周对比：以基准日为T，T−22～T−16对比T−29～T−23。\n② 月对比：当月21日起，1日至T−16对比上月完整自然月；历史月份按完整自然月对比。',
   sort:['按SPU的总退、已收退环比增长率最大值从高到低排序','涨幅相同，按该SPU近30天销售额从高到低排序']
  },
  8:{
   note:'按SPU和平台判定，偏差＝所选成熟期间的实际退货率－目标退货率。',
   pool:[`同期原始销量＞${rpDeviationMinSales}件，且总退或已收退存在偏差
  • 总退偏差：＞${rpReturnDeviationLimits.return}；已收偏差：＞${rpReturnDeviationLimits.received}`],
   sort:['按SPU的总退、已收退偏差最大值从高到低排序','偏差相同，按该SPU近30天销售额从高到低排序']
  }
 };
 const {note,pool,detail,sort,sortDetail}=rules[kind];
 return '入榜条件\n'+note+'\n'+pool.map(s=>'• '+s).join('\n')+(detail?'\n'+detail:'')+(kind===1?'\n\n店铺分红黄绿规则\n'+filterCatalog.platforms.map(platform=>'• '+rpShopScoreHint(platform)).join('\n'):'')+'\n\n排序规则\n'+sort.map((s,i)=>(i+1)+'. '+s).join('\n')+(sortDetail?'\n'+sortDetail:'');
}
