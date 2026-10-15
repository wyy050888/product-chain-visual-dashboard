// 保留原表头与事件：纵向跟随抽屉，横向仍由表格容器和固定列管理。
let rpStickyHeaderDispose=null;
function rpStickListHeader(host){
 rpStickyHeaderDispose?.();
 const body=$('#dialogbody'),overlay=$('#overlay'),head=host.querySelector('thead'),table=head?.closest('table');
 if(!head)return;
 let frame=0,offset=0,disposed=false;
 function update(){
  frame=0;
  if(!host.isConnected||overlay.hidden){dispose();return}
  const naturalTop=head.getBoundingClientRect().top-offset;
  const boundary=body.getBoundingClientRect().top+body.clientTop;
  const limit=Math.max(0,table.getBoundingClientRect().bottom-naturalTop-head.offsetHeight);
  offset=Math.min(limit,Math.max(0,boundary-naturalTop));
  head.style.transform=`translateY(${offset}px)`;
 }
 function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(update)}
 function dispose(){
  if(disposed)return;
  disposed=true;cancelAnimationFrame(frame);
  body.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
  resize.disconnect();lifecycle.disconnect();head.style.removeProperty('transform');
  if(rpStickyHeaderDispose===dispose)rpStickyHeaderDispose=null;
 }
 const resize=new ResizeObserver(schedule);
 resize.observe(body);resize.observe(host);resize.observe(head);
 const lifecycle=new MutationObserver(()=>{if(!host.isConnected||overlay.hidden)dispose();else schedule()});
 lifecycle.observe(body,{childList:true});
 lifecycle.observe(overlay,{attributes:true,attributeFilter:['hidden']});
 body.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
 rpStickyHeaderDispose=dispose;schedule();
}

// 返回父层复用原节点，重新接上已在离开时清理的滚动监听。
$('#dialogbody').addEventListener('drawer:restored',()=>{
 const host=$('#dialogbody .rp-list-table');if(host)rpStickListHeader(host);
});
