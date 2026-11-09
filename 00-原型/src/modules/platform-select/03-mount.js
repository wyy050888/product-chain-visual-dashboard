// 增量处理新增筛选、选项更新与抽屉重绘，已挂载控件只同步，不重复注册事件。
function uiPlatformEnhance(root){
 if(root.matches?.('select'))uiPlatformMountSelect(root);
 for(const select of root.querySelectorAll?.('select')||[])uiPlatformMountSelect(select);
}
const uiPlatformPending=new Set();let uiPlatformScheduled=false;
new MutationObserver(records=>{
 for(const record of records){
  if(record.target.closest?.('.ui-platform-trigger,.ui-platform-options'))continue;
  const select=record.target.closest?.('select');if(select)uiPlatformPending.add(select);
  for(const node of record.addedNodes||[])if(node.nodeType===1&&!node.matches('.ui-platform-trigger,.ui-platform-options'))uiPlatformPending.add(node);
 }
 if(uiPlatformScheduled||!uiPlatformPending.size)return;uiPlatformScheduled=true;
 queueMicrotask(()=>{
  uiPlatformScheduled=false;const roots=[...uiPlatformPending];uiPlatformPending.clear();
  for(const root of roots)if(root.isConnected)uiPlatformEnhance(root);
  uiPlatformReposition();
 });
}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','multiple','hidden','label']});
document.addEventListener('change',e=>{if(e.target.matches?.('select')){e.target.uiPlatformControl?.sync();if(e.target.uiPlatformMulti)uiPlatformSyncMulti(e.target)}});
uiPlatformEnhance(document);
