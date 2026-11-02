import assert from 'node:assert/strict';

// 检查真实文字矩形，避免“全文可见”通过但收起按钮仍盖住正文。
export async function assertPreviewButtonClear(preview){
 const state=await preview.evaluate(async el=>{
  while(el.parentElement.classList.contains('is-transitioning'))await new Promise(requestAnimationFrame);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const button=el.parentElement.querySelector('[data-gd-cell-more]'),box=button.getBoundingClientRect();
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),range=document.createRange(),overlap=[];
  let node;
  while((node=walker.nextNode())){
   if(!node.textContent.trim())continue;
   range.selectNodeContents(node);
   if([...range.getClientRects()].some(r=>Math.min(r.right,box.right)-Math.max(r.left,box.left)>.5&&Math.min(r.bottom,box.bottom)-Math.max(r.top,box.top)>.5))overlap.push(node.textContent);
  }
  return {expanded:button.getAttribute('aria-expanded'),overlap};
 });
 assert.equal(state.expanded,'true');
 assert.deepEqual(state.overlap,[],'收起按钮不与任何正文文字重叠');
}
