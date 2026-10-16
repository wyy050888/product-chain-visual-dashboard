(() => {
  let tooltip, active = null, pinned = false;

  function hide() {
    active?.removeAttribute('aria-describedby');
    active = null;
    pinned = false;
    tooltip.hidden = true;
  }

  function renderContent(target) {
    tooltip.replaceChildren();
    tooltip.classList.remove('is-multiline', 'is-target-detail');
    // 结构化数据只经 textContent 写入，避免将业务名称当成 HTML。
    if (!target.dataset.tipDetails) {
      tooltip.textContent = target.dataset.tip;
      tooltip.classList.toggle('is-multiline', target.dataset.tip.includes('\n'));
      return;
    }
    const detail = JSON.parse(target.dataset.tipDetails);
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    tooltip.classList.add('is-target-detail');
    const state = detail.reasonable ? 'reasonable' : 'unreasonable';
    const heading = element('div', 'tip-heading');
    heading.append(element('span', 'tip-period', detail.period), element('span', `tip-status ${state}`, detail.reasonable ? '✓ 合理' : '! 不合理'));
    const values = element('dl', 'tip-values');
    const metrics = [
      ['产品目标', detail.gsv.toFixed(2) + 'w'],
      ['链接目标合计', detail.linkedGsv.toFixed(2) + 'w'],
      ['覆盖率', detail.coverage == null ? '—' : detail.coverage.toFixed(2) + '%'],
    ];
    metrics.forEach(([label, value], index) => {
      values.append(element('dt', '', label), element('dd', index === 2 ? `tip-coverage ${state}` : '', value));
    });
    const rule = detail.coverage == null ? '无法计算覆盖率' : '覆盖率 ≥ 70% 为合理';
    tooltip.append(heading, values, element('div', 'tip-rule', rule));
  }

  function show(target) {
    if (active !== target) {
      active?.removeAttribute('aria-describedby');
      pinned = false;
    }
    active = target;
    renderContent(target);
    tooltip.hidden = false;
    target.setAttribute('aria-describedby', tooltip.id);

    // 挂在 body 下，避开表格 overflow；靠边时平移，下方不足时翻到上方。
    const anchor = target.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - box.width / 2, viewportWidth - box.width - margin));
    const below = anchor.bottom + 10 + box.height <= viewportHeight - margin;
    const preferredTop = below ? anchor.bottom + 10 : anchor.top - box.height - 10;
    const top = Math.max(margin, Math.min(preferredTop, viewportHeight - box.height - margin));
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.dataset.placement = below ? 'bottom' : 'top';
    tooltip.style.setProperty('--tip-arrow-left', Math.max(14, Math.min(box.width - 14, anchor.left + anchor.width / 2 - left)) + 'px');
  }

  function toggle(target) {
    if (active === target && pinned) { hide(); return; }
    show(target);
    pinned = true;
  }

  function init() {
    tooltip = document.createElement('div');
    tooltip.id = 'prototype-tooltip';
    tooltip.className = 'prototype-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    document.body.append(tooltip);
    document.addEventListener('pointerover', event => {
      const target = event.target.closest('.info[data-tip]');
      if (target && target !== active) show(target);
    });
    document.addEventListener('pointerout', event => {
      if (active?.contains(event.target) && !active.contains(event.relatedTarget) && !pinned) hide();
    });
    document.addEventListener('focusin', event => {
      const target = event.target.closest('.info[data-tip]');
      if (target) show(target);
    });
    document.addEventListener('focusout', event => {
      if (active === event.target) hide();
    });
    document.addEventListener('click', event => {
      if (active && !active.contains(event.target)) hide();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') hide();
      const target = event.target.closest('.info[data-tip]');
      if (target && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        toggle(target);
      }
    });
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
  }
  GoalPrototype.tooltips = { init, toggle, hide };
})();
