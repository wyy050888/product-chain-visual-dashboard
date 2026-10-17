// 移动原图到原生模态框，保留圆点数据和事件；关闭时原位还原，不复制ID或重算指标。
let kpmZoomState=null;
function kpmCloseChartZoom(restoreFocus=true){
 const state=kpmZoomState;if(!state)return;
 kpmZoomState=null;kpmHidePointTooltip();
 if(state.dialog.open)state.dialog.close();
 state.marker.replaceWith(state.plot);document.body.append(kpmPointTooltip);
 state.trigger.textContent='⛶ 放大';state.trigger.setAttribute('aria-label','放大产品经营矩阵');state.trigger.setAttribute('aria-expanded','false');
 state.dialog.remove();document.documentElement.classList.remove('kpm-zoom-open');
 if(restoreFocus&&state.trigger.isConnected)state.trigger.focus({preventScroll:true});
}
function kpmOpenChartZoom(trigger){
 if(kpmZoomState)return;
 kpmHidePointTooltip();hideMetricTooltip();
 const plot=trigger.closest('.matrixplot'),marker=document.createElement('div'),dialog=document.createElement('dialog');
 marker.className='kpm-chart-placeholder';marker.style.height=plot.getBoundingClientRect().height+'px';marker.setAttribute('aria-hidden','true');
 dialog.className='kpm-chart-zoom';dialog.setAttribute('aria-label','产品经营矩阵放大');
 plot.before(marker);dialog.append(plot,kpmPointTooltip);$('#matrix').append(dialog);
 kpmZoomState={plot,marker,dialog,trigger,suspended:false,focus:null};
 trigger.textContent='×';trigger.setAttribute('aria-label','关闭放大弹窗');trigger.setAttribute('aria-expanded','true');
 // 原生dialog提供焦点约束、背景不可操作及Escape取消；圆点提示随图进入顶层。
 dialog.addEventListener('cancel',e=>{e.preventDefault();kpmCloseChartZoom()});
 dialog.addEventListener('close',()=>{if(kpmZoomState?.dialog===dialog&&!kpmZoomState.suspended&&!dialog.open)kpmCloseChartZoom()});
 dialog.addEventListener('click',e=>{
  if(e.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)kpmCloseChartZoom();
 });
 document.documentElement.classList.add('kpm-zoom-open');dialog.showModal();trigger.focus({preventScroll:true});
}
document.addEventListener('click',e=>{
 const trigger=e.target.closest('#matrix.kpm-main [data-kpm-expand]');if(!trigger)return;
 if(kpmZoomState)kpmCloseChartZoom();else kpmOpenChartZoom(trigger);
});

// 打开详情时暂时退出浏览器顶层，保留原图和滚动；最终关闭抽屉后恢复同一弹窗。
function kpmSuspendChartZoom(){
 const state=kpmZoomState;if(!state||state.suspended)return;
 state.suspended=true;state.focus=document.activeElement;kpmHidePointTooltip();
 state.scroll={left:state.plot.querySelector('#matrixchart').scrollLeft,top:state.plot.querySelector('#matrixchart').scrollTop};
 state.dialog.close();
}
new MutationObserver(()=>{
 const state=kpmZoomState;if(!state?.suspended||!$('#overlay').hidden)return;
 state.suspended=false;state.dialog.showModal();
 const chart=state.plot.querySelector('#matrixchart');chart.scrollLeft=state.scroll.left;chart.scrollTop=state.scroll.top;
 // 关闭抽屉后的焦点回到原图圆点；不自动弹出圆点提示。
 (state.focus?.isConnected?state.focus:state.trigger).focus({preventScroll:true});kpmHidePointTooltip();
}).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
