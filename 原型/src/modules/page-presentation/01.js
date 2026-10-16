const presentationLabelSelector = 'small,dt,th,label,.metriclabel,h2,h3,.salesrow>span:first-child,.newmetric>span:first-child,.costnumbers>span:first-child,.rf-indicators small,.qf-indicators small,span';
const presentationExplanation = /^(?:仅纳入已有销售|按完整.+目标计算|按卡点责任部门归因|按实际业务完成时间统计|上品计划按|查看截止日|上线指标按|库存数、金额|风险与储备按|储备[／/]合作数量取|仅累计所选周期|按销售额排序展示|资质审核通过后|按新增供应商去重|三级类目准入储备.+预警|罚款[＞>]冻结[＞>]下架[＞>]退货[＞>]进线|平台罚款[＞>]资金冻结[＞>]链接下架[＞>]退货率[＞>]进线率|逐项红绿灯|按风险优先级排序|按亏损绝对值排序|高危风险优先展示|延期项目已合并|同一型号不重复|目标为当前类型合计|各类别独立TOP|点击.+查看)/;
const presentationPrototype = /演示|原型|设计示例|模拟数据|未连接业务系统|未接入业务系统|未调用真实|不会变更真实|尚未向人员发送真实消息|当前保存本地任务|仅保存在当前浏览器|仅在当前浏览器/;
function suppressPresentation(element) {
  element.classList.add('presentation-suppressed');
}
function presentationText(element) {
  return [...element.childNodes].filter(node => !(node.nodeType === 1 && node.classList.contains('metric-help')))
    .map(node => node.textContent).join('').trim();
}
function existingMetricRule(label) {
  const parent = label.parentElement;
  const own = label.dataset.metricOriginalRule || label.getAttribute('title');
  const nearby = parent?.querySelector(':scope > [title],:scope > strong [title],:scope > b [title],:scope > span [title],:scope > [data-metric-original-rule],:scope > strong [data-metric-original-rule]');
  const raw = own || parent?.dataset.metricOriginalRule || parent?.getAttribute('title')
    || nearby?.dataset.metricOriginalRule || nearby?.getAttribute('title');
  if (!raw || !/[÷≥≤<>＝=目标阈值口径计算月近]/.test(raw)) return '';
  const owner = own ? label : parent?.hasAttribute('title') ? parent : nearby;
  if (owner) {
    owner.dataset.metricOriginalRule = raw;
    owner.removeAttribute('title');
  }
  return raw;
}
function decorateMetricLabels(root) {
  for (const label of root.querySelectorAll(presentationLabelSelector)) {
    // 六榜抽屉仅由榜单渲染器添加指定的两个指标说明，避免排序、翻页后自动补回其他问号。
    if (label.closest('.rp-list-table') || label.closest('#dialogbody')?.querySelector('.rp-list-table')) continue;
    if (label.hasAttribute('data-up-basic') || label.closest('.metric-help,.metric-tooltip,.portal-header,svg,.presentation-suppressed,.up-detail,.ms-drawer,.pp-risk-detail,.pp-traffic,#pp-ledger-popover,#riskrail .riskcard,#sales,#newtable,#projects.pp-main')) continue;
    // 不把整个卡片或表格当成指标名称；只识别短标签。
    const text = metricLabelText(label);
    if (!text || text.length > 40 || label.querySelector('table,select,input,textarea')) continue;
    const fallback = metricDefinition(text, label);
    if (!fallback) continue;
    const specific = existingMetricRule(label);
    const rule = /库存周转率|^周转率$/.test(text) && specific && !/成本/.test(specific)
      ? fallback + ' ' + specific : specific || fallback;
    addMetricHelp(label, rule);
  }
}
function cleanPresentation(root) {
  if (!root?.querySelectorAll || root.closest?.('.metric-tooltip,.metric-help,.portal-header')) return;
  // Keep the editable quality target control available after removing its explanation block.
  const qualityConfig=root.querySelector('#qrb-config');
  if(qualityConfig?.closest('.qrb-business,.rd-rule-content')) {
    document.querySelectorAll('#dialogactions #qrb-config').forEach(button=>button.remove());
    document.querySelector('#dialogactions')?.prepend(qualityConfig);
  }
  // 模块标题旁的业务说明持续展示，不随加载后的文案清理隐藏。
  root.querySelectorAll('.sectionhead .titlegroup>.tag,.sectionhead>.inline>.note:not([id]),#ai-inline-foot,#dialognote,#lifetitle,.ai-detail-heading h3,#aigrid p,.matrix-ai-summary>h4,.qr-card-filter>span,.rd-rule-content').forEach(suppressPresentation);
  for (const block of root.querySelectorAll('details')) {
    if (/指标口径|数据说明|计算口径|原型说明/.test(block.querySelector('summary')?.textContent || '')) suppressPresentation(block);
  }
  for (const element of root.querySelectorAll('.note,.notice,.source,p,small,.tag,.footer,.toast')) {
    // AI业务正文含模拟供方等演示内容时仍须可读，不能当说明文案整段隐藏。
    if(element.closest('.up-ai-section')){element.classList.remove('presentation-suppressed');continue;}
    if (element.closest('.metric-tooltip,.metric-help,svg') || element.querySelector('input,select,textarea,button,table')) continue;
    const text = presentationText(element);
    if (!text) continue;
    if (presentationExplanation.test(text.replace(/\s+/g, ''))) {
      suppressPresentation(element);
      continue;
    }
    if (presentationPrototype.test(text)) {
      if (element.classList.contains('source')) {
        const cleaned = text.replace(/模拟|演示|示例/g, '');
        if (element.children.length === 0 && cleaned !== text) element.textContent = cleaned;
      } else if (/^目标金额|^证据来源|^来源|^数据截至/.test(text)) {
        const cleaned = cleanMetricRule(text);
        if (element.children.length === 0 && cleaned !== text) element.textContent = cleaned;
      } else suppressPresentation(element);
    }
  }
  // 只移走统计规则，日期范围和未结束状态继续外显。
  root.querySelectorAll('.period-note>span:not(.period-range)').forEach(suppressPresentation);
  root.querySelectorAll('.sectionhead>.note').forEach(element => {
    if (!/\d{4}|截止|单位/.test(element.textContent)) suppressPresentation(element);
  });
  cleanDemoPresentation(root);
  decorateMetricLabels(root);
  groupRiskCardMetricHelp(root, existingMetricRule);
}
const presentationObserver = new MutationObserver(records => {
  const scopes = new Set();
  for (const record of records) {
    if (record.target.closest?.('.metric-tooltip,.metric-help,.portal-header')) continue;
    if (record.addedNodes.length === 0) continue;
    const content = [...record.addedNodes].filter(node => node.nodeType === 1 || node.nodeType === 3);
    if (content.length && content.every(node => node.nodeType === 1 && node.matches('.metric-help,.metric-tooltip'))) continue;
    const scope = record.target.closest?.('section.section,.dialogbody,.dialogsub,.toast') || record.target;
    if (scope.querySelectorAll) scopes.add(scope);
  }
  if (activeMetricHelp && !activeMetricHelp.isConnected) hideMetricTooltip();
  for (const scope of scopes) cleanPresentation(scope);
});
presentationObserver.observe(document.body, { childList: true, subtree: true });
cleanPresentation(document.body);
const presentationToast = toast;
toast = message => presentationToast(String(message)
  .replace('已刷新当前筛选下的演示诊断，未调用真实 AI 服务', '诊断已刷新')
  .replace(/演示数据范围/g, '数据范围').replace(/演示诊断/g, '诊断'));
