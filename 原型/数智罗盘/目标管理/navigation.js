(() => {
  // 菜单只维护名称与页面标识；现有目标页面继续管理各自业务交互。
  const groups = [
    { name: '店铺管理', items: [['店铺配置', 'shop-config']] },
    { name: '一类目标', items: [['一类目标总览', 'overview'], ['一类目标填报', 'entry'], ['达播目标填报', 'dabo']] },
    { name: '二类目标', items: [['品类目标', 'category-target'], ['二类大区目标', 'region-target'], ['二类部门目标', 'department-target'], ['二类人员目标', 'staff-target'], ['商品卡目标设置', 'product-card-target']] },
    { name: '其他目标', items: [['退货率目标', 'return-target'], ['利润率灯色管理', 'profit-colors']] },
    { name: '直播管理', items: [['主播排班', 'anchor-schedule'], ['值班管理', 'duty-management'], ['主播管理', 'anchor-management'], ['主推产品管理', 'featured-products'], ['直播部门管理', 'live-departments'], ['快手号挂播配置', 'kuaishou-config']] },
    { name: '客服管理', items: [['客服排班', 'service-schedule'], ['排班导入记录', 'schedule-imports']] },
    { name: '业绩相关配置', items: [['开屏广告', 'splash-ad'], ['预估退货率', 'estimated-returns'], ['业绩人工审核', 'performance-review']] },
    { name: '系统管理', items: [['PC菜单管理', 'pc-menu'], ['字典管理', 'dictionary'], ['协议管理', 'agreements']] },
  ];
  const navigation = document.getElementById('settings-navigation');
  const content = document.querySelector('main.content');

  groups.forEach((group, index) => {
    const section = document.createElement('div');
    section.className = 'nav-group';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-group-toggle';
    toggle.setAttribute('aria-expanded', String(index === 0));
    toggle.setAttribute('aria-controls', `settings-group-${index}`);
    toggle.innerHTML = `<span>${group.name}</span><span class="nav-chevron" aria-hidden="true"></span>`;
    const children = document.createElement('div');
    children.id = `settings-group-${index}`;
    children.className = 'nav-children';
    children.hidden = index !== 0;
    toggle.addEventListener('click', () => {
      children.hidden = !children.hidden;
      toggle.setAttribute('aria-expanded', String(!children.hidden));
    });
    group.items.forEach(([name, page]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-leaf';
      button.textContent = name;
      button.dataset.page = page;
      button.dataset.group = group.name;
      button.addEventListener('click', () => {
        if(page==='shop-config'){location.assign('../店铺配置.html?platform=tmall');return}
        if (!['overview', 'entry', 'dabo'].includes(page)) return;
        selectPage(page);
      });
      children.append(button);
    });
    section.append(toggle, children);
    navigation.append(section);
  });

  function selectPage(page) {
    const buttons = [...navigation.querySelectorAll('.nav-leaf')];
    const selected = ['overview', 'entry', 'dabo'].includes(page)
      ? buttons.find(button => button.dataset.page === page)
      : buttons[0];
    buttons.forEach(button => {
      const active = button === selected;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    navigation.querySelectorAll('.nav-group-toggle').forEach(toggle => {
      const active = toggle.parentElement.contains(selected);
      toggle.classList.toggle('has-selection', active);
      if (active) {
        toggle.setAttribute('aria-expanded', 'true');
        toggle.nextElementSibling.hidden = false;
      }
    });
    content.querySelectorAll(':scope > .page').forEach(section => section.classList.remove('active'));
    const target = document.getElementById(selected.dataset.page);
    target.classList.add('active');
    content.scrollTop = 0;
  }

  document.querySelector('.brand-home').addEventListener('click', event => {
    event.preventDefault();
    selectPage('overview');
  });
  // 兼容此前带页面后缀的地址；菜单切换不再修改 URL。
  if (location.hash) history.replaceState(null, '', location.href.split('#')[0]);
  GoalPrototype.navigation = { selectPage };
  selectPage('overview');
})();
