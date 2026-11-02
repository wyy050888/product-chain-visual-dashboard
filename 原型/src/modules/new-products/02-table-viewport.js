// 可视区按真实行高显示六行半；长名称、列宽调整和窄屏换行后自动重算。
function nspFitTableViewport(host){
 dashboardQueueLayout(host,nspMeasureTableViewport);
}
function nspMeasureTableViewport(host){
 const table=host.querySelector('table');
 if(!table?.getClientRects().length)return;
 const rows=[...(table.tBodies[0]?.rows||[])],partial=rows[6];
 if(!partial)return ()=>host.style.removeProperty('--nsp-table-max-height');
 const row=partial.getBoundingClientRect(),content=row.top-table.getBoundingClientRect().top+row.height/2;
 const chrome=host.offsetHeight-host.clientHeight;
 const height=Math.ceil(content+chrome)+'px';
 if(host.style.getPropertyValue('--nsp-table-max-height')!==height)return ()=>host.style.setProperty('--nsp-table-max-height',height);
}
const nspTableViewportObserver=new ResizeObserver(entries=>{
 for(const {target} of entries){const host=target.closest('#newtable');if(host)nspFitTableViewport(host)}
});
function nspObserveTableViewport(host){
 nspTableViewportObserver.disconnect();nspFitTableViewport(host);dashboardQueueLayout(host,dashboardMeasureResetScroll);
 const table=host.querySelector('table');if(table)nspTableViewportObserver.observe(table);
}
