// 同帧先测量、后写入；按测量函数和宿主去重，避免各模块交替读写强制重排。
const dashboardLayoutJobs=new Map();let dashboardLayoutFrame=0;
function dashboardQueueLayout(target,measure){
 let targets=dashboardLayoutJobs.get(measure);
 if(!targets){targets=new Set();dashboardLayoutJobs.set(measure,targets)}
 targets.add(target);if(dashboardLayoutFrame)return;
 dashboardLayoutFrame=requestAnimationFrame(()=>{
  dashboardLayoutFrame=0;
  const batch=[...dashboardLayoutJobs];dashboardLayoutJobs.clear();
  const writes=[];
  for(const [read,hosts] of batch)for(const host of hosts)if(host.isConnected){const write=read(host);if(write)writes.push(write)}
  for(const write of writes)write();
 });
}
function dashboardMeasureResetScroll(host){if(host.scrollTop)return ()=>{host.scrollTop=0}}

// 图表输出未变时保留已有SVG、悬浮事件和布局结果；宿主被其他视图重建后仍重新挂载。
const dashboardRenderedMarkup=new WeakMap();
function dashboardRenderMarkup(host,markup){
 const previous=dashboardRenderedMarkup.get(host);
 if(previous?.markup===markup&&previous.first===host.firstChild)return false;
 host.innerHTML=markup;dashboardRenderedMarkup.set(host,{markup,first:host.firstChild});return true;
}
