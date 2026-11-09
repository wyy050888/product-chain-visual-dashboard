(() => {
  const root = document.documentElement;
  let ready = false;
  let state = 'loading';
  root.dataset.dashboardBoot = state;
  function updateCopy() {
    const title = document.getElementById('boot-title');
    const text = document.getElementById('boot-text');
    const retry = document.getElementById('boot-retry');
    if (!title || !text || !retry) return;
    if (state === 'error') {
      title.textContent = '看板暂时未能加载';
      text.textContent = '请检查网络连接，重新加载试试。';
    } else if (state === 'slow') {
      title.textContent = '看板仍在加载中';
      text.textContent = '加载用时较长，请稍候，或重新加载试试。';
    }
    retry.hidden = state === 'loading';
  }
  const slowTimer = setTimeout(() => {
    if (ready || state === 'error') return;
    state = 'slow';
    root.dataset.dashboardBoot = state;
    updateCopy();
  }, 12000);
  function fail() {
    if (ready) return;
    clearTimeout(slowTimer);
    state = 'error';
    root.dataset.dashboardBoot = state;
    updateCopy();
  }
  window.addEventListener('error', event => {
    const source = event.target instanceof HTMLScriptElement ? event.target.src : event.filename;
    if (source && /\/assets\/app\.js(?:[?#]|$)/.test(source)) fail();
  }, true);
  window.addEventListener('dashboard:ready', () => {
    ready = true;
    clearTimeout(slowTimer);
    root.dataset.dashboardBoot = 'ready';
    document.querySelector('main.page')?.removeAttribute('inert');
    document.querySelector('main.page')?.setAttribute('aria-busy', 'false');
    document.querySelector('.portal-header')?.removeAttribute('inert');
    document.getElementById('dashboard-boot')?.setAttribute('aria-hidden', 'true');
  }, { once: true });
  document.addEventListener('DOMContentLoaded', updateCopy, { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest?.('#boot-retry')) location.reload();
  });
})();
