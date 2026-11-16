// 同一个问号可查当前统计截止日所在季度及年度的生效条件。
function nspRenderAssessmentHelp(host,period){
 const body=metricRuleCard(host,'新品纳入与成功考核','成功率目标 ≥'+brcNumber('new.successRate')+'%');
 host.querySelector('h4').id='nsp-assessment-help-title';
 const controls=metricRuleNode(body,'div','','nsp-assessment-help-modes');
 controls.setAttribute('role','group');
 controls.setAttribute('aria-label','考核口径');
 const modes=[['quarter','季度考核'],['year','年度考核']].map(([mode,label])=>{
  const button=metricRuleNode(controls,'button',label);
  button.type='button';button.dataset.nspHelpMode=mode;button.setAttribute('aria-controls','nsp-assessment-help-content');
  return button;
 });
 const content=metricRuleNode(body,'div','','nsp-assessment-help-content');
 content.id='nsp-assessment-help-content';
 content.setAttribute('aria-live','polite');
 function showMode(annual){
  for(const button of modes)button.setAttribute('aria-pressed',String((button.dataset.nspHelpMode==='year')===annual));
  content.replaceChildren();
  nspRenderAssessmentHelpContent(content,annual,period.end);
 }
 for(const button of modes)button.onclick=()=>{
  if(button.getAttribute('aria-pressed')==='true')return;
  showMode(button.dataset.nspHelpMode==='year');
  host.scrollTop=0;
  positionMetricTooltip(activeMetricHelp);
 };
 showMode(period.annual);
}

function nspAssessmentThresholdRows(annual,conditions){
 const categories=[['四季品',annual?'success-year':'success-quarter'],['夏季品、冬季品','success-season']];
 const metrics=['gsv','profitRate','returnRate'];
 const groups=categories.map(([,group])=>brcResultCondition(group,conditions));
 const simple=groups.every(rule=>rule.op==='all'&&rule.conditions.length===metrics.length&&
  metrics.every(metric=>rule.conditions.some(term=>term.metric===metric&&Number.isFinite(term.a))));
 if(simple){
  const [[allSeasonGsv,profit,returns],[seasonGsv,seasonProfit,seasonReturns]]=groups.map(rule=>
   metrics.map(metric=>rule.conditions.find(term=>term.metric===metric))
  );
  if(brcSameCondition(profit,seasonProfit)&&brcSameCondition(returns,seasonReturns)){
   const gsvLabel=annual?'全年 GSV 基准':'季度 GSV';
   return [[categories[0][0],gsvLabel+brcConditionText(allSeasonGsv,'万元')],
    [categories[1][0],gsvLabel+brcConditionText(seasonGsv,'万元')],
    ['各季品共用','利润率'+brcConditionText(profit,'%')+'，总退率'+brcConditionText(returns,'%')]];
  }
 }
 return categories.map(([label,group])=>[label,brcResultText(group,conditions)]);
}

function nspRenderAssessmentHelpContent(host,annual,cutoff){
 const conditions=brcSuccessConditions(annual,cutoff);
 const append=metricRuleNode;
 const rows=append(host,'ol','','nsp-assessment-help-list');
 const section=(title,description)=>{
  const row=append(rows,'li');
  append(row,'h5',title);
  if(description)append(row,'p',description);
  return row;
 };
 section('① 新品判定',annual
  ?'截至统计截止日，当年参加过季度考核的新品按产品简称去重，包含当年已成功和已出池的新品。'
  :'按产品简称归集同系列 SPU，以上市最早的型号日期为准。本季新上市和往季未成功的新品纳入考核。');
 section('② 新品业绩计算',annual
  ?'取年初至统计截止日的累计业绩。同一简称下，各型号的业绩从各自上市日起计入，按年度条件独立复核。'
  :'取季度开始至统计截止日的业绩。同一简称下，各型号的业绩从各自上市日起计入，汇总 GSV、利润、销量和退货，再计算利润率和总退率。');
 const criteria=section('③ 新品成功率及判定条件');
 append(criteria,'p',annual
  ?'年度成功的简称数 ÷ 年度纳入考核的简称数 × 100%'
  :'本季首次成功的简称数 ÷ 本季纳入考核的简称数 × 100%','nsp-tip-formula');
 const thresholds=append(criteria,'dl','','nsp-assessment-help-thresholds');
 for(const [label,rule] of nspAssessmentThresholdRows(annual,conditions)){
  append(thresholds,'dt',label);
  append(thresholds,'dd',rule);
 }
 if(annual)append(criteria,'p','当年新上市：年度 GSV 门槛 = 全年 GSV 基准 × 自上市日至年末的自然天数 ÷ 全年自然天数，含上市当天。跨年滚入按全年门槛，利润率和总退率按年度规则直接判断。');
 const exceptions=section('④ 特殊情况说明');
 const note=(label,description)=>{
  const line=append(exceptions,'p');
  append(line,'strong',label);
  line.append('　'+description);
 };
 note('特批',annual?'年度特批单独认定，季度成功结果按年度条件重新复核。':'当季获批后，按该产品简称计为成功。');
 note('同系列分批上线',annual
  ?'同简称各型号合计年度业绩，分子和分母均按简称计数。'
  :'先上线型号已成功，后续同简称型号上线即承接成功状态，分子和分母均不重复计入。先上线型号未成功，后续型号的当季业绩合并到同一简称后重新判定。');
 const exit=section('⑤ 出池规则',annual
  ?'按首次季度成功日期执行出池，当年已出池的新品仍纳入该年度复核。'
  :'首次成功后，后续季度停止重复考核，首次成功季度结束满 '+brcNumber('new.exitDays')+' 个自然日后出池。未成功的新品跨季、跨年继续考核。');
 append(exit,'p','在成功率卡片点击“查看'+(annual?'年度':'季度')+'考核”或数字可查名单，包含已出池产品。');
}
function nspRenderStatusTooltip(host,annual){
 const h=document.createElement('div');h.className='nsp-tip-heading';const title=document.createElement('h4');title.textContent=annual?'年度是否成功':'是否成功';h.append(title);host.append(h);
 const p=document.createElement('p');p.className='nsp-tip-note';p.textContent=nspStatusRule(annual);host.append(p);
}
