// 风险榜共用口径集中到标题；具体产品目标仍留在对应明细。
function commonRiskCardRule(kind, label, element, raw) {
  const fallback=metricDefinition(label,element);
  if(kind===0) return fallback || raw;
  if(kind===1 && label==='店铺GSV') {
    return '所选周期扣除退款后的店铺净销售额；低于对应店铺截至当前日期的目标标红。';
  }
  // 去掉各行的目标数值及代入计算值，保留共同公式和固定阈值。
  let rule=cleanMetricRule(raw || fallback);
  rule=rule.replace(/高于目标\s*[\d,.]+%\s*标红/g,'高于对应SPU与平台的目标时标红')
    .replace(/[；;]\s*已收退\s*[\d,.]+[，,]\s*销量\s*[\d,.]+/g,'')
    .replace(/目标\s*[\d,.]+\s*(?:万元|元|件|%)/g,'目标按对应SPU与平台设置')
    .replace(/[（(][\d,.]+件[）)]/g,'')
    .replace(/(前30天GSV×105%)[：:]\s*[\d,.]+万元/g,'$1');
  if(kind===2)rule=rule.replaceAll('对应SPU与平台','对应SPU的全公司汇总');
  return rule;
}
function groupRiskCardMetricHelp(root, readRule) {
  const cards=[...root.querySelectorAll('#riskrail .riskcard')];
  if(root.matches?.('#riskrail .riskcard')) cards.unshift(root);
  for(const card of cards) {
    const title=card.querySelector('.rhead h3');
    if(!title) continue;
    const kind=Number(card.querySelector('.rhead [data-risk]')?.dataset.risk);
    const rules=new Map();
    for(const label of card.querySelectorAll('.qf-indicators small,.rf-indicators small')) {
      const name=metricLabelText(label);
      const rule=cleanMetricRule(commonRiskCardRule(kind,name,label,readRule(label)));
      label.querySelectorAll('.metric-help').forEach(help=>help.remove());
      if(!rule) continue;
      if(!rules.has(name)) rules.set(name,new Set());
      rules.get(name).add(rule);
    }
    // 空筛选时保留同榜上一次口径；有数据时按当前平台重新汇总。
    if(!rules.size) continue;
    const platform=card.querySelector('#qr-card-platform,#br-card-platform,[data-rr-platform]');
    const selected=platform?.selectedOptions[0]?.textContent;
    const heading=selected && selected!=='全部平台' ? '平台：'+selected+'\n\n' : '';
    const content=heading+[...rules].map(([name,values])=>name+'：'+[...values].join('；')).join('\n\n');
    addMetricHelp(title,content);
    const help=title.querySelector(':scope > .metric-help');
    help.classList.add('card-metric-help');
    help.setAttribute('aria-label','查看'+metricLabelText(title)+'指标说明');
  }
}
