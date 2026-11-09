const ShopAttribution = (() => {
  const key = 'goal-prototype-targets-v1', channel = new BroadcastChannel('compass-shop-targets');
  const listeners = new Set();
  let cachedRaw, cached;
  function read() {
    try {
      const raw = localStorage.getItem(key);
      if (!cached || raw !== cachedRaw) {
        cached = GoalAssignmentSnapshots.project(JSON.parse(raw || 'null') || {});
        cachedRaw = raw;
      }
      return cached;
    } catch { return { error: '目标数据读取失败，请刷新后重试', rows: new Map(), records: [] }; }
  }
  function notify() { for (const fn of listeners) fn(); }
  channel.onmessage = event => {
    if (event.data?.type !== 'targets' || !event.data.state?.product || !event.data.state?.link) return;
    try {
      const current = JSON.parse(localStorage.getItem(key) || 'null');
      if ((event.data.state.revision || 0) >= (current?.revision || 0)) {
        localStorage.setItem(key, JSON.stringify(event.data.state)); notify();
      }
    } catch { notify(); }
  };
  channel.postMessage({ type: 'request' });
  window.addEventListener('storage', event => { if (event.key === key) notify(); });
  window.addEventListener('focus', notify);
  return { read, subscribe(fn) { listeners.add(fn); } };
})();
