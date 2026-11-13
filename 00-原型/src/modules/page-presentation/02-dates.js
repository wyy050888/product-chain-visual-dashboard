// 只格式化展示文字；ISO字段、data属性及可编辑表单值保持原值，用于筛选、排序和存储。
function presentationDateText(text){
 return String(text).replace(/(?<![\w])((?:19|20)\d{2})[-/年](\d{1,2})[-/月](\d{1,2})日?(?!\d)/g,(raw,year,month,day)=>{
  const date=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
  if(date.getUTCFullYear()!==Number(year)||date.getUTCMonth()!==Number(month)-1||date.getUTCDate()!==Number(day))return raw;
  return year.slice(-2)+'/'+month.padStart(2,'0')+'/'+day.padStart(2,'0');
 });
}
function formatDisplayedDates(root){
 const skip='script,style,input,textarea,[contenteditable="true"],[data-date-raw]';
 const formatNode=node=>{
  if(!/\d{4}[-/年]/.test(node.nodeValue))return;
  if(node.parentElement?.closest(skip))return;
  const value=presentationDateText(node.nodeValue);if(value!==node.nodeValue)node.nodeValue=value;
 };
 if(root.nodeType===Node.TEXT_NODE){formatNode(root);return}
 if(root.nodeType!==Node.ELEMENT_NODE||root.closest(skip))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())formatNode(walker.currentNode);
 for(const el of [root,...root.querySelectorAll('[title],[aria-label],[aria-valuetext]')])
  for(const attr of ['title','aria-label','aria-valuetext'])formatDisplayedDateAttribute(el,attr);
}
function formatDisplayedDateAttribute(el,attr){
 const value=el.getAttribute(attr);
 if(!value||!/\d{4}[-/年]/.test(value)||el.closest('script,style,input,textarea,[contenteditable="true"],[data-date-raw]'))return;
 const next=presentationDateText(value);if(next!==value)el.setAttribute(attr,next);
}
const dateDisplayObserver=new MutationObserver(records=>{
 const roots=new Set();
 for(const record of records){
  if(record.type==='childList')for(const node of record.addedNodes)roots.add(node);
  else if(record.type==='attributes'){
   if(record.target.isConnected)formatDisplayedDateAttribute(record.target,record.attributeName);
  }else roots.add(record.target);
 }
 for(const root of roots)if(root.isConnected)formatDisplayedDates(root);
});
dateDisplayObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','aria-valuetext']});
formatDisplayedDates(document.body);
