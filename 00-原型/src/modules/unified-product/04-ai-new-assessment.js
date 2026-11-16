// 新品按产品简称考核。详情业绩与部门风险仍以当前SPU为对象。
function upUsesNewProductAssessment(product,cutoff,module){
 return pfIdentity(product).isNew===true&&(module==='new'||nspPoolStatus(product,cutoff).inNewPool);
}

function upAiNewAssessment(product,end){
 const series=nspSeriesFor(product,end);
 const year=Number(end.slice(0,4)),value=Math.ceil(Number(end.slice(5,7))/3);
 const period={...nspSuccessPeriod({mode:'quarter',year,value}),end};
 const {facts,firstSuccess}=nspSuccessFact(series,period);
 const group=nspSuccessRuleGroup(pfIdentity(series).attribute,false),conditions=brcSuccessConditions(false,period.start);
 const rule=brcResultCondition(group,conditions),values={gsv:facts?facts.gsvCents/1000000:null,profitRate:facts?.profitRate,returnRate:facts?.returnRate};
 // 只有必需的单项条件可直接用于安排动作。完整条件组合随依据展示。
 const gaps=rule.op==='all'&&facts?.sales>0?rule.conditions.filter(term=>term.metric&&Number.isFinite(values[term.metric])&&!brcPredicateTest(term,'value',values)).map(term=>term.metric):[];
 const status=firstSuccess?(firstSuccess.approval?'特批成功':'首次达标'):facts?'截至目前未达标':'本期未纳入销售成功考核';
 const firstRange=firstSuccess?nspApprovalPeriodRange(firstSuccess.quarter):null;
 const firstFacts=firstRange&&!firstSuccess.approval?nspAssessmentFacts(series,series.actualLaunch>firstRange.start?series.actualLaunch:firstRange.start,firstSuccess.date):null;
 const firstRule=firstRange?brcResultText(group,brcSuccessConditions(false,firstRange.start)):null;
 return {kind:'new',shortName:series.shortName,periodKey:period.key,start:period.start,end,firstSuccess,firstRule,
  firstFacts:firstFacts?{gsvCents:firstFacts.gsvCents,profitRate:firstFacts.profitRate,returnRate:firstFacts.returnRate}:null,facts,status,
  rule:brcResultText(group,conditions),gaps:[...new Set(gaps)]};
}

function upAiNewActualText(facts){
 return '产品简称口径GSV '+upAiMoney(facts.gsvCents)+'、利润率'+upPercent(facts.profitRate)+'、总退率'+upPercent(facts.returnRate);
}

function upAiNewAssessmentText(a){
 const success=a.firstSuccess,period=success?.quarter||a.periodKey;
 const status=nspSuccessQuarterLabel(period)+'新品考核'+a.status+(success?'（'+success.date+'）':'');
 if(!a.facts||period!==a.periodKey)return status+'。';
 const actual=upAiNewActualText(a.facts);
 const labels={gsv:'GSV',profitRate:'利润率',returnRate:'总退率'};
 const gaps=!success&&a.gaps.length?'待改善项为'+a.gaps.map(key=>labels[key]).join('、')+'。':'';
 return status+'。'+actual+'。当季成功条件为'+a.rule+'。'+gaps;
}

function upAiNewVerdict(a){
 const {assessment:s,direction:d}=a;
 if(!d.hasSales)return '先核对渠道开售状态和首单记录，明确下一步动销验证。';
 if(d.overallLoss||!s.firstSuccess&&s.gaps.includes('profitRate'))return '优先核实新品利润缺口，测算产品成本和渠道费用后再决定追加投入。';
 if(d.hasReturns||!s.firstSuccess&&s.gaps.includes('returnRate'))return '优先核实退货原因，验证改善效果后再决定是否放量。';
 if(s.firstSuccess)return '新品已通过季度销售成功考核，后续投入以动销、利润和供给表现为依据。';
 return '优先核查新品距离销售成功的差距，按渠道验证可改善的环节。';
}

function upAiNewFollowup(a){
 const {assessment:s,direction:d}=a;
 if(!d.hasSales)return '产品中心与运营核实可售状态、首单及数据覆盖，确认后再复核销售成功条件。';
 if(s.firstSuccess)return '产品中心结合当前动销、利润和退货评估后续投入，计划部按可售库存与在途核对供给。';
 if(s.gaps.includes('returnRate')&&!d.hasReturns)return '产品中心和用户中心按考核期拆查各渠道退货订单与原因，确认影响最大的环节，按当季总退率复核。';
 if(s.gaps.includes('gsv'))return '产品中心与运营对照各渠道曝光、转化及可售库存，确认销售卡点，再用同口径GSV、利润率和总退率复核小范围验证结果。';
 return '产品中心以当季新品考核条件复核改善结果，确认利润、退货和动销表现后再决定新增投入。';
}
