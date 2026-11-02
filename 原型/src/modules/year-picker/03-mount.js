// 批次先读样式再挂载；只处理受影响的 select，不同步无关控件。
function uiYearRefresh(selects){
 const work=[...new Set(selects)].filter(select=>select.isConnected&&(select.uiYearControl||!select.hidden&&uiYearOptions(select))).map(select=>({select,style:select.uiYearControl?.field.contains(select)||select.closest('.ui-year-field')?.querySelector(':scope>.ui-year-trigger')?null:uiYearReadStyle(select)}));
 for(const {select,style} of work)uiYearMount(select,style);
}
function uiYearSelects(root){return [...(root.matches?.('select')?[root]:[]),...(root.querySelectorAll?.('select')||[])]}
function uiYearEnhance(root){uiYearRefresh(uiYearSelects(root))}
let uiYearQueued=false;const uiYearPending=new Set();
new MutationObserver(records=>{
 let changed=false;
 for(const record of records){
  if(record.target.closest?.('.ui-year-trigger,.ui-year-panel'))continue;
  changed=true;const select=record.target.closest?.('select');if(select)uiYearPending.add(select);
  for(const node of record.addedNodes||[])if(node.nodeType===1&&!node.matches('.ui-year-trigger,.ui-year-panel'))for(const select of uiYearSelects(node))uiYearPending.add(select);
 }
 // 不维护全局控件集合：关闭的移除节点可自然回收，打开的节点及时解除引用。
 if(uiYearActive&&!uiYearActive.select.isConnected)uiYearActive.close();
 if(changed)uiYearReposition();
 if(uiYearQueued||!uiYearPending.size)return;uiYearQueued=true;
 queueMicrotask(()=>{uiYearQueued=false;const selects=[...uiYearPending];uiYearPending.clear();uiYearRefresh(selects)});
}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','hidden','multiple','label','class']});
document.addEventListener('change',e=>{if(e.target.matches?.('select'))e.target.uiYearControl?.sync()});
uiYearEnhance(document);
