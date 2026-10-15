// 仅清理展示文案；数据中的样例标记、业务数值和可编辑表单内容保持原值。
function presentationDemoText(text){
 return String(text)
  .replace(/[（(](?:方案演示|演示|原型|模拟数据|样例数据)[）)]/g,'')
  .replace(/\s*[·｜|]\s*(?:演示台账|演示规则|演示数据|样例数据|原型说明)/g,'')
  .replace(/(?:演示|模拟|样例)(?=台账|报价|数据|规则|阈值|目标|供方|供应商|考核月|品质周报|采购日报|研发周报|经营会议|财务确认|日报|业务日|诊断|SKU)/g,'')
  .trim();
}
function cleanDemoPresentation(root){
 if(!root?.querySelectorAll)return;
 const skipped='script,style,textarea,input,select,[contenteditable="true"],.presentation-suppressed';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(/演示|模拟|样例/.test(node.textContent)&&!node.parentElement?.closest(skipped))nodes.push(node);
 }
 for(const node of nodes){const next=presentationDemoText(node.textContent);if(next!==node.textContent)node.textContent=next;}
 const elements=[root,...root.querySelectorAll('[title],[data-metric-rule],[aria-label]')];
 for(const element of elements){
  if(!element.getAttribute||element.closest(skipped))continue;
  for(const attr of ['title','data-metric-rule','aria-label']){
   const text=element.getAttribute(attr);if(!text||!/演示|模拟|样例/.test(text))continue;
   const next=presentationDemoText(text);if(next!==text)element.setAttribute(attr,next);
  }
 }
}
