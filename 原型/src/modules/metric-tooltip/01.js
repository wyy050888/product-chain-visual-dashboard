// 图标徽标复用统一浮层，避免浏览器原生title的延迟提示。
const metricHelpSelector='.metric-help,.rp-shop-assessed[data-metric-rule],.up-stock-donut[data-metric-rule]';
const metricTooltip = document.createElement('div');
metricTooltip.id = 'metric-tooltip';
metricTooltip.className = 'metric-tooltip';
metricTooltip.setAttribute('role', 'tooltip');
metricTooltip.hidden = true;
document.body.append(metricTooltip);
let activeMetricHelp = null, metricHideTimer = 0;
function hideMetricTooltip() {
  clearTimeout(metricHideTimer);
  activeMetricHelp?.removeAttribute('aria-describedby');
  activeMetricHelp = null;
  metricTooltip.hidden = true;
}
// 两张新品指标卡：公式、统计口径、判定条件分别排版。
function renderNewKpiTooltip(help){
 const success=help.dataset.nspKpi==='新品销售成功率',annual=help.dataset.metricRule.includes('年度标准：');
 const append=(parent,tag,text,className='')=>{
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node;
 };
 const header=append(metricTooltip,'div','','nsp-tip-heading');
 append(header,'h4',help.dataset.nspKpi);
 if(success)append(header,'span','目标 ≥66%','nsp-tip-target');
 append(metricTooltip,'div',success?'成功新品数 ÷ 纳入统计新品数 × 100%':'实际上线项目数 ÷ 应上线项目数 × 100%','nsp-tip-formula');
 const list=append(metricTooltip,'dl','','nsp-tip-definitions');
 const rows=success?[
  ['分子',annual?'截至统计截止日，达到年度标准的新品数':'截至统计截止日，本季度首次达到成功标准的新品数'],
  ['分母',annual?'年度统计范围内的新品，按SPU去重；不排除季度已成功产品':'本期已上线且此前季度未成功的新品，按SPU去重；往期已成功产品不再纳入，即使后续下滑'],
  ['统计时间','从上线累计至统计截止日，不设90/120天等待门槛']
 ]:[
  ['分子','应上线项目中，截至统计截止日已完成大货交付，且满足下方时限的项目数'],
  ['分母','应上线项目数，按项目去重'],
  ['排除范围','不含大货交付任务的项目，不计入分子、分母']
 ];
 for(const [label,value] of rows){append(list,'dt',label);append(list,'dd',value)}
 const criteria=append(metricTooltip,'section','','nsp-tip-criteria');
 append(criteria,'h5',success?(annual?'年度成功条件 · 同时满足':'季度成功条件 · 同时满足'):'计入分子的完成时限');
 if(success){
  const rules=append(criteria,'ul','');
  append(rules,'li',`累计GSV：四季品 ≥${annual?'2000':'500'}万元；夏季品、冬季品 ≥750万元`);
  append(rules,'li','利润率 ≥12% 且 总退 ≤60%');
 }else{
  append(criteria,'strong','实际完成时间 ≤ 计划完成时间 + 10天');
  append(criteria,'p','例：计划10月1日完成，10月11日完成计入，10月12日完成不计入');
 }
 append(metricTooltip,'p',success?'年度独立复核，不平均季度成功率；季度成功不代表年度成功。无有效分母时显示“—”':'未完成或超过时限不计入分子；以上线项目的大货交付任务为准，不以首单或销售额判定','nsp-tip-note');
}
// 六榜规则按语义分组；所有文案使用textContent，避免把内容当作HTML执行。
function renderMetricTooltipContent(help){
 const text=help.dataset.metricRule;
 metricTooltip.replaceChildren();
 if(help.dataset.nspKpi){renderNewKpiTooltip(help);return}
 if(help.classList.contains('nsp-period-help')){
  const [heading,...lines]=text.split('\n'),title=document.createElement('h4'),description=document.createElement('p');
  title.textContent=heading;description.textContent=lines.join('\n');metricTooltip.append(title,description);
  return;
 }
 if(help.classList.contains('up-stock-donut')){
  for(const line of text.split('\n')){const row=document.createElement('div');row.className='stock-tooltip-line';row.textContent=line;metricTooltip.append(row)}
  return;
 }
 if(!help.classList.contains('card-metric-help')||!text.startsWith('入榜条件\n')){
  metricTooltip.textContent=text;return;
 }
 for(const block of text.split('\n\n')){
  const [heading,...lines]=block.split('\n');
  const section=document.createElement('section');section.className='metric-rule-section';
  const title=document.createElement('h4');title.textContent=heading;section.append(title);
  let list=null;
  for(const line of lines){
   if(/^(?:• |\d+\. )/.test(line)){
    if(!list){list=document.createElement(heading==='排序规则'?'ol':'ul');section.append(list)}
    const item=document.createElement('li');item.textContent=line.replace(/^(?:• |\d+\. )/,'');list.append(item);
   }else if(line){list=null;const note=document.createElement('p');note.textContent=line;section.append(note);}
  }
  metricTooltip.append(section);
 }
}
function showMetricTooltip(help) {
  clearTimeout(metricHideTimer);
  if (!help?.dataset.metricRule) return;
  activeMetricHelp?.removeAttribute('aria-describedby');
  activeMetricHelp = help;
  help.setAttribute('aria-describedby', 'metric-tooltip');
  metricTooltip.classList.toggle('metric-tooltip-card', help.classList.contains('card-metric-help'));
  metricTooltip.classList.toggle('metric-tooltip-kpi', help.classList.contains('nsp-kpi-help'));
  metricTooltip.classList.toggle('metric-tooltip-nsp-card', Boolean(help.dataset.nspKpi));
  metricTooltip.classList.toggle('metric-tooltip-period', help.classList.contains('nsp-period-help'));
  renderMetricTooltipContent(help);
  metricTooltip.hidden = false;
  const anchor = help.getBoundingClientRect(), box = metricTooltip.getBoundingClientRect();
  const left = Math.max(8, Math.min(innerWidth - box.width - 8, anchor.left - 8));
  const below = anchor.bottom + 9;
  const top = below + box.height <= innerHeight - 8 ? below : Math.max(8, anchor.top - box.height - 9);
  metricTooltip.style.left = left + 'px';
  metricTooltip.style.top = top + 'px';
}
function addMetricHelp(label, rule) {
  if (!rule || label.closest('.up-detail')) return;
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
  else if (metricTooltip.contains(event.target)) clearTimeout(metricHideTimer);
});
document.addEventListener('pointerout', event => {
  if (!activeMetricHelp) return;
  const next = event.relatedTarget;
  if (next && (activeMetricHelp.contains(next) || metricTooltip.contains(next))) return;
  metricHideTimer = setTimeout(hideMetricTooltip, 120);
});
document.addEventListener('focusin', event => {
  if (event.target.matches?.(metricHelpSelector)) showMetricTooltip(event.target);
});
document.addEventListener('focusout', event => {
  if (event.target.matches?.(metricHelpSelector)) hideMetricTooltip();
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
  if (!metricTooltip.contains(event.target)) hideMetricTooltip();
}, true);
window.addEventListener('resize', hideMetricTooltip);
