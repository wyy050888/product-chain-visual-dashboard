// 只统一展示用词；业务对象、日期、data键及可编辑内容保留原值。
function presentationTermText(value){
 return String(value).replaceAll('上线','上市').replaceAll('整机供应商','一级供应商').replace(/(?<!核心)物料供应商/g,'二级供应商')
  .replaceAll('渠道/平台','平台').replaceAll('平台/渠道','平台')
  .replace(/销售渠道|淘客渠道|抖音渠道指导价|渠道/g,term=>term==='渠道'?'平台':term);
}
function formatDisplayedTerms(root){
 const skip='script,style,input,textarea,[contenteditable="true"],[data-preserve-terms]';
 const formatText=node=>{
  if(node.parentElement?.closest(skip))return;
  const next=presentationTermText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
 };
 if(root.nodeType===Node.TEXT_NODE){formatText(root);return}
 if(root.nodeType!==Node.ELEMENT_NODE||root.closest('script,style'))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())formatText(walker.currentNode);
 const attrs=['title','aria-label','aria-valuetext','placeholder','alt','data-label'];
 for(const element of [root,...root.querySelectorAll(attrs.map(attr=>'['+attr+']').join(','))]){
  if(element.closest(skip))continue;
  for(const attr of attrs){
   const value=element.getAttribute(attr);if(value==null)continue;
   const next=presentationTermText(value);if(next!==value)element.setAttribute(attr,next);
  }
 }
}
// 仅遍历新增节点或发生变化的目标，不在每次重绘后扫描整张看板。
const termDisplayObserver=new MutationObserver(records=>{
 const roots=new Set();
 for(const record of records){
  if(record.type==='childList')for(const node of record.addedNodes)roots.add(node);
  else roots.add(record.target);
 }
 for(const root of roots)if(root.isConnected)formatDisplayedTerms(root);
});
termDisplayObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','aria-valuetext','placeholder','alt','data-label']});
formatDisplayedTerms(document.body);
