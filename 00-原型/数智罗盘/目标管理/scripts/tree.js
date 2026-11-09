(() => {
  const { $, state, escape, fixtures } = GoalPrototype;
  const nodes = [{ name: '一类电商', level: 'whole', path: '一类电商', parent: null }];
  const folded = new Set();
  // 保留预置组织节点，并补充手动填报的归属组合；只展示到渠道。
  function addAttribution(shop) {
    let parent = nodes[0];
    ['region', 'brand', 'channel'].forEach(level => {
      const path = parent.path + '/' + shop[level];
      let node = nodes.find(item => item.path === path);
      if (!node) {
        node = { name: shop[level], level, path, parent: parent.path };
        nodes.push(node);
      }
      parent = node;
    });
  }
  Object.values(fixtures.shops).forEach(addAttribution);
  const daboPath = '一类电商/达播';
  nodes.push({ name: '达播', level: 'dabo', path: daboPath, parent: '一类电商' });
  const roots = () => nodes.filter(node => node.parent === null).map(branch).join('');
  function sync() {
    const count = nodes.length;
    GoalPrototype.targetStore.attributions().forEach(addAttribution);
    if (nodes.length !== count) $('.tree').innerHTML = roots() + '<div id="treeEmpty" class="empty-state" hidden></div>';
  }
  function branch(node) {
    const channels = GoalPrototype.config.options.平台渠道;
    const children = nodes.filter(item => item.parent === node.path);
    if (node.level === 'brand') children.sort((a, b) => channels.indexOf(a.name) - channels.indexOf(b.name));
    const levelClass = { whole: '', region: 'r', brand: 'b', channel: 'c', dabo: 'r' }[node.level];
    const arrow = children.length
      ? `<button class="tree-arrow" data-tree-toggle aria-label="收起${escape(node.name)}" aria-expanded="true">⌄</button>`
      : '<span class="tree-arrow" aria-hidden="true"></span>';
    return `<div class="node ${levelClass}" data-path="${escape(node.path)}" data-level="${node.level}">
      ${arrow}<button class="tree-label" data-tree-select>${escape(node.name)}</button>
      ${node.level === 'channel' ? '<span class="tree-status info" tabindex="0" role="button" data-action="toggle-tip"></span>' : ''}
      </div>` + children.map(branch).join('');
  }
  function refreshVisibility() {
    const term = $('.tree-search').value.trim().toLocaleLowerCase();
    const onlyAbnormal = $('#treeOnlyAbnormal').checked;
    const abnormal = [...$('.tree').querySelectorAll('.node[data-level="channel"]')].filter(element => element.querySelector('.tree-status.no')).map(element => element.dataset.path);
    const matches = nodes.filter(node => node.name.toLocaleLowerCase().includes(term));
    let count = 0;
    $('.tree').querySelectorAll('.node').forEach(element => {
      const path = element.dataset.path;
      const matchesTerm = term
        ? matches.some(node => node.path === path || node.path.startsWith(path + '/') || path.startsWith(node.path + '/'))
        : onlyAbnormal || ![...folded].some(parent => path.startsWith(parent + '/'));
      const visible = matchesTerm && (path === daboPath || daboPath.startsWith(path + '/') || !onlyAbnormal || abnormal.some(channel => channel === path || channel.startsWith(path + '/')));
      element.hidden = !visible;
      const name = nodes.find(node => node.path === path).name;
      const at = term ? name.toLocaleLowerCase().indexOf(term) : -1;
      element.querySelector('.tree-label').innerHTML = at < 0 ? escape(name) : escape(name.slice(0, at)) + '<mark>' + escape(name.slice(at, at + term.length)) + '</mark>' + escape(name.slice(at + term.length));
      if (visible) count++;
      const toggle = element.querySelector('[data-tree-toggle]');
      if (toggle) {
        const expanded = !!term || onlyAbnormal || !folded.has(path);
        toggle.textContent = expanded ? '⌄' : '›';
        toggle.disabled = !!term || onlyAbnormal;
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.setAttribute('aria-label', (expanded ? '收起' : '展开') + element.querySelector('.tree-label').textContent);
      }
    });
    $('#treeEmpty').hidden = count > 0;
    $('#treeEmpty').textContent = onlyAbnormal ? '当前范围没有匹配的异常渠道' : '未找到匹配的大区、品牌或渠道';
  }
  function select(path) {
    const node = nodes.find(item => item.path === path);
    if (!node) return;
    // 达播入口统一跳转填报页，保留当前总览节点和筛选状态。
    if (node.level === 'dabo') { GoalPrototype.navigation.selectPage('dabo'); return; }
    if (state.path === path) return;
    const previousLevel = state.level;
    state.level = node.level;
    state.path = node.path;
    nodes.filter(parent => path.startsWith(parent.path + '/')).forEach(parent => folded.delete(parent.path));
    GoalPrototype.overview.selectNode(previousLevel);
    refreshVisibility();
    const selected = [...$('.tree').querySelectorAll('.node')].find(element => element.dataset.path === path);
    selected?.scrollIntoView({ block: 'nearest' });
  }
  function init() {
    $('.tree').innerHTML = roots() + '<div id="treeEmpty" class="empty-state" hidden>未找到匹配的大区、品牌或渠道</div>';
    $('#treeHelp').dataset.tip = GoalPrototype.config.tips.tree;
    $('.tree-search').addEventListener('input', refreshVisibility);
    $('#treeOnlyAbnormal').addEventListener('change', refreshVisibility);
    $('.tree').addEventListener('click', event => {
      const element = event.target.closest('.node');
      if (!element || event.target.closest('.tree-status')) return;
      const path = element.dataset.path;
      if (event.target.closest('[data-tree-toggle]')) {
        if (folded.has(path)) folded.delete(path); else folded.add(path);
        refreshVisibility();
        return;
      }
      select(path);
    });
    refreshVisibility();
  }
  function refresh(options) {
    $('.tree').querySelectorAll('.node').forEach(element => {
      const selected = state.path === element.dataset.path;
      element.classList.toggle('active', selected);
      element.querySelector('[data-tree-select]').setAttribute('aria-current', String(selected));
      const dot = element.querySelector('.tree-status');
      if (!dot) return;
      const row = GoalPrototype.model.treeStatus({ ...options, path: element.dataset.path });
      dot.className = 'tree-status info ' + (row.reasonable ? 'ok' : 'no');
      dot.dataset.tip = row.reason;
      dot.setAttribute('aria-label', (row.reasonable ? '合理：' : '不合理：') + row.reason);
    });
    refreshVisibility();
  }
  GoalPrototype.tree = { init, sync, refresh, select, children: path => nodes.filter(node => node.parent === path) };
})();
