// 图标徽标复用统一浮层，避免浏览器原生title的延迟提示。
// 指标说明仅由问号触发；名称补全和图表数据点继续使用各自入口。
const metricHelpSelector='.metric-help,.rp-shop-core[data-rp-core-names],.ip-brand-share-arc[data-metric-rule],.ip-stale-mark[data-metric-rule]';
const metricTooltip = document.createElement('div');
metricTooltip.id = 'metric-tooltip';
metricTooltip.className = 'metric-tooltip';
metricTooltip.setAttribute('role', 'tooltip');
metricTooltip.hidden = true;
document.body.append(metricTooltip);
let activeMetricHelp = null;
const metricHover=createTooltipHover(metricTooltip,()=>activeMetricHelp,hideMetricTooltip);
function hideMetricTooltip() {
  metricHover.keep();
  activeMetricHelp?.removeAttribute('aria-describedby');
  activeMetricHelp = null;
  metricTooltip.hidden = true;
}
// 两张新品指标卡：公式、统计口径、判定条件分别排版。
function renderNewKpiTooltip(help){
 if(help.dataset.nspKpi==='新品销售成功率'){nspRenderSuccessTooltip(metricTooltip,help.dataset.nspAnnual==='true');return}
 const append=(parent,tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.append(n);return n};
 const header=append(metricTooltip,'div','','nsp-tip-heading');append(header,'h4',help.dataset.nspKpi.replace('上线及时率','上市及时率'));
 append(metricTooltip,'div','实际上市项目数 ÷ 应上市项目数 × 100%','nsp-tip-formula');
 const list=append(metricTooltip,'dl','','nsp-tip-definitions');
 for(const [k,v] of [['分子','截至截止日已完成大货交付，且实际完成不晚于允许期限的项目'],['分母','包含大货交付任务的应上市项目']]){append(list,'dt',k);append(list,'dd',v)}
 const criteria=append(metricTooltip,'section','','nsp-tip-criteria');append(criteria,'h5','按期完成条件');append(criteria,'strong','实际完成时间 ≤ 计划完成时间＋'+brcNumber('new.deliveryDays')+'天');
 append(metricTooltip,'p','未完成或超期不计入分子。','nsp-tip-note');
}
// 六榜规则按语义分组；所有文案使用textContent，避免把内容当作HTML执行。
function renderMetricTooltipContent(help){
 const text=help.dataset.metricRule;
 metricTooltip.replaceChildren();
 if(help.matches('.ip-brand-share-arc')){ipRenderBrandShareTooltip(metricTooltip,help);return}
 if(help.dataset.ipTrendPoint){ipRenderStaleTrendTooltip(metricTooltip,help);return}
 if(help.dataset.gdCoreHelp){gdRenderCoreTooltip(metricTooltip);return}
 if(kpmIsGradeHelp(help)){kpmRenderGradeHelp(metricTooltip);return}
 if(help.dataset.rpCoreHelp){rpRenderShopCoreHelp(metricTooltip);return}
 if(help.dataset.qualityRates){renderQualityRatesTooltip(metricTooltip);return}
 if(help.dataset.ipOverviewHelp==='refurb'){ipRenderOverviewHelp(metricTooltip);return}
 if(help.dataset.ipSummaryHelp){ipRenderSummaryHelp(metricTooltip,help);return}
 if(help.dataset.scpResourceHelp){scpRenderResourceHelp(metricTooltip,Number(help.dataset.scpRuleYear)||+DATA_CUTOFF.slice(0,4));return}
 if(help.dataset.scpMaterialHelp){scpRenderMaterialHelp(metricTooltip,Number(help.dataset.scpRuleYear)||+DATA_CUTOFF.slice(0,4));return}
 if(help.dataset.scpSourcingHelp||help.dataset.scpCategoryHelp){scpRenderSourcingHelp(metricTooltip,Boolean(help.dataset.scpCategoryHelp),Number(help.dataset.scpRuleYear)||+DATA_CUTOFF.slice(0,4));return}
 if(help.dataset.ipRule){renderInventoryMetricTooltip(metricTooltip,help.dataset.ipRule);return}
 if(help.closest('.nsp-pool-help')){nspRenderPoolTooltip(metricTooltip,text);return}
 if(help.dataset.nspStatus){nspRenderStatusTooltip(metricTooltip,help.dataset.nspStatus==='annual');return}
 if(help.dataset.nspKpi){renderNewKpiTooltip(help);return}
 if(help.classList.contains('pp-analysis-help')){renderProjectAnalysisTooltip(metricTooltip);return}
 if(help.classList.contains('nsp-period-help')){
  const [heading,...lines]=text.split('\n'),title=document.createElement('h4'),description=document.createElement('p');
  title.textContent=heading;description.textContent=lines.join('\n');metricTooltip.append(title,description);
  return;
 }
 if(help.dataset.gdTabHelp){gdRenderScopeTooltip(metricTooltip,help);return}
 if(!help.classList.contains('card-metric-help')||!text.startsWith('入榜条件\n')){
  metricTooltip.textContent=text;return;
 }
 for(const block of text.split('\n\n')){
  const [heading,...lines]=block.split('\n');
  const section=document.createElement('section');section.className='metric-rule-section';
  const title=document.createElement('h4');title.textContent=heading;section.append(title);
  if(heading==='总退/已收退红黄绿规则'){rpRenderReturnColorRules(section);metricTooltip.append(section);continue}
  if(heading==='店铺分红黄绿规则'){rpRenderShopScoreRules(section);metricTooltip.append(section);continue}
  let list=null,sublist=null,formulas=null;
  for(const line of lines){
   // 两空格子项及四空格说明归属上一条，保留真实列表层级。
   if(line.startsWith('  • ')&&list?.lastElementChild){
    if(!sublist){sublist=document.createElement('ul');sublist.className='metric-rule-sublist';list.lastElementChild.append(sublist)}
    const item=document.createElement('li');item.textContent=line.slice(4);sublist.append(item);continue;
   }
   if(line.startsWith('    ')&&sublist?.lastElementChild){const note=document.createElement('p');note.textContent=line.trim();sublist.lastElementChild.append(note);continue}
   sublist=null;
   if(/^(?:可售库存|可售天数|总可售天数)\s*[＝=]/.test(line)){
    list=null;
    if(!formulas){formulas=document.createElement('div');formulas.className='metric-rule-formulas';section.append(formulas)}
    const row=document.createElement('div');row.textContent=line;formulas.append(row);continue;
   }
   formulas=null;
   if(/^(?:• |\d+\. )/.test(line)){
    if(!list){list=document.createElement(heading==='排序规则'?'ol':'ul');section.append(list)}
    const item=document.createElement('li');item.textContent=line.replace(/^(?:• |\d+\. )/,'');list.append(item);
   }else if(line){list=null;const note=document.createElement('p');note.textContent=line;section.append(note);}
  }
  metricTooltip.append(section);
 }
}
function showMetricTooltip(help) {
  metricHover.keep();
  if (!help?.matches(metricHelpSelector)||!help.dataset.metricRule) return;
  activeMetricHelp?.removeAttribute('aria-describedby');
  activeMetricHelp = help;
  metricTooltip.classList.toggle('metric-tooltip-gd-core',Boolean(help.dataset.gdCoreHelp));
  metricTooltip.classList.toggle('metric-tooltip-ip-brand-share',help.matches('.ip-brand-share-arc'));
  metricTooltip.classList.toggle('metric-tooltip-ip-stale-trend',Boolean(help.dataset.ipTrendPoint));
  help.setAttribute('aria-describedby', 'metric-tooltip');
  metricTooltip.classList.toggle('metric-tooltip-card', help.classList.contains('card-metric-help'));
  metricTooltip.classList.toggle('metric-tooltip-kpi', help.classList.contains('nsp-kpi-help'));
  metricTooltip.classList.toggle('metric-tooltip-kpm-grade',kpmIsGradeHelp(help));
  metricTooltip.classList.toggle('metric-tooltip-nsp-card', Boolean(help.dataset.nspKpi||help.dataset.nspStatus));
  metricTooltip.classList.toggle('metric-tooltip-nsp-pool', Boolean(help.closest('.nsp-pool-help')));
  metricTooltip.classList.toggle('metric-tooltip-period', help.classList.contains('nsp-period-help'));
  metricTooltip.classList.toggle('metric-tooltip-project-analysis', help.classList.contains('pp-analysis-help'));
  metricTooltip.classList.toggle('metric-tooltip-inventory',Boolean(help.dataset.ipRule));
  metricTooltip.classList.toggle('metric-tooltip-stock-refurb',help.dataset.ipOverviewHelp==='refurb');
  metricTooltip.classList.toggle('metric-tooltip-inventory-summary',Boolean(help.dataset.ipSummaryHelp));
  metricTooltip.classList.toggle('metric-tooltip-quality-rates',Boolean(help.dataset.qualityRates));
  metricTooltip.classList.toggle('metric-tooltip-scp-sourcing',Boolean(help.dataset.scpSourcingHelp||help.dataset.scpCategoryHelp||help.dataset.scpMaterialHelp||help.dataset.scpResourceHelp));
  metricTooltip.classList.toggle('metric-tooltip-scp-material',Boolean(help.dataset.scpMaterialHelp));
  metricTooltip.classList.toggle('metric-tooltip-scp-resource',Boolean(help.dataset.scpResourceHelp));
  metricTooltip.classList.toggle('metric-tooltip-shop-core',Boolean(help.dataset.rpCoreHelp));
  metricTooltip.classList.toggle('metric-tooltip-shop-core-names',Boolean(help.dataset.rpCoreNames));
  renderMetricTooltipContent(help);
  cleanDemoPresentation(metricTooltip);
  metricTooltip.hidden = false;
  const anchor = help.getBoundingClientRect(), box = metricTooltip.getBoundingClientRect();
  const left = Math.max(8, Math.min(innerWidth - box.width - 8, anchor.left - 8));
  const below = anchor.bottom + 9;
  const top = below + box.height <= innerHeight - 8 ? below : Math.max(8, anchor.top - box.height - 9);
  metricTooltip.style.left = left + 'px';
  metricTooltip.style.top = top + 'px';
}
// 仅净销量字段调用；原始销量继续使用自身口径，日期前缀由调用方保留。
function netSalesHelp(key){
 return key==='netSales'?'<span class="metric-help net-sales-help" role="button" tabindex="0" aria-label="查看销量指标口径" data-metric-rule="此处为去退后销量"></span>':'';
}
function netSalesLabel(label,key){return esc(label)+netSalesHelp(key)}
function addMetricHelp(label, rule) {
  if(label.closest('[data-metric-help-disabled]')){label.querySelectorAll('.metric-help').forEach(help=>help.remove());return}
  if(isProfitMetricHelpSuppressed(metricLabelText(label))){label.querySelectorAll('.metric-help').forEach(help=>help.remove());return}
  if(label.querySelector('.net-sales-help'))return;
  // 关键产品经营抽屉的灯色、数量和正文不自动补通用口径问号。
  if (!rule || isReturnMetricHelpSuppressed(metricLabelText(label),label) || label.closest('.up-detail,.kpm-price-distribution,.kpm-management-heading,.kpm-management-drawer')) return;
  let help = [...label.children].find(node => node.classList.contains('metric-help'));
  if (!help) {
    help = document.createElement('span');
    help.className = 'metric-help';
    help.setAttribute('role', 'button');
    help.setAttribute('tabindex', '0');
    label.append(help);
  }
  help.setAttribute('aria-label', '查看' + metricLabelText(label) + '指标口径');
  help.dataset.metricRule = cleanMetricRule(rule);
}
function handleMetricHelp(event) {
  const help = event.target.closest?.(metricHelpSelector);
  if (!help) return;
  event.preventDefault();
  event.stopPropagation();
  showMetricTooltip(help);
}
document.addEventListener('pointerover', event => {
  const help = event.target.closest?.(metricHelpSelector);
  if (help) showMetricTooltip(help);
  else if (metricTooltip.contains(event.target)) metricHover.keep();
});
document.addEventListener('focusin', event => {
  if (event.target.matches?.(metricHelpSelector)) showMetricTooltip(event.target);
});
document.addEventListener('click', event => {
  if (event.target.closest?.(metricHelpSelector)) handleMetricHelp(event);
  else if (!metricTooltip.contains(event.target)) hideMetricTooltip();
}, true);
document.addEventListener('keydown', event => {
  if (event.target.matches?.(metricHelpSelector) && ['Enter', ' '].includes(event.key)) handleMetricHelp(event);
  if (event.key === 'Escape' && !metricTooltip.hidden) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hideMetricTooltip();
  }
}, true);
document.addEventListener('scroll', event => {
  if (metricTooltip.contains(event.target)) return;
  const help=activeMetricHelp;
  // 新品表格自动横向滚动后，鼠标仍在问号上时重定位，不直接关掉提示。
  if(help?.classList.contains('nsp-kpi-help')&&help.matches(':hover')){
    requestAnimationFrame(()=>{
      if(activeMetricHelp!==help)return;
      if(help.isConnected&&help.matches(':hover'))showMetricTooltip(help);
      else hideMetricTooltip();
    });
  }else hideMetricTooltip();
}, true);
window.addEventListener('resize', hideMetricTooltip);
