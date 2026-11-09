import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const modules=new URL('../../src/modules/',import.meta.url);
function sourceAudit(){
 const files=fs.readdirSync(modules,{recursive:true}).filter(name=>name.endsWith('.js')),raw=/<label\b[^>]*>[^<]*<(?:em|span|b)\b[^>]*>\s*[*＊]\s*<\/(?:em|span|b)>/;
 for(const name of files)assert(!raw.test(fs.readFileSync(new URL(name.replaceAll('\\','/'),modules),'utf8')),'字段名与必填标记未合组：'+name);
 const profiles=[['core-link-config/03-view.js','klc-form'],['procurement-assignment/02.js','sc-assign'],['quality-risk/02.js','risk-assign-grid'],['risk-workflow/01.js','risk-assign-grid']];
 return profiles.map(([file,layout])=>({layout,captions:[...fs.readFileSync(new URL(file,modules),'utf8').matchAll(/(<label\b[^>]*><span class="ui-field-caption">[\s\S]*?<\/span>(?:<\/span>)?)/g)].map(match=>match[1])}));
}
async function checkCaptions(root){
 const result=await root.locator('.ui-field-caption').evaluateAll(nodes=>nodes.map(caption=>{
  const marker=caption.querySelector('em,span,b'),name=[...caption.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()),range=document.createRange();range.selectNode(name);const text=range.getBoundingClientRect(),star=marker.getBoundingClientRect(),box=caption.getBoundingClientRect();
  return {name:caption.textContent.trim(),sameLine:Math.abs((text.top+text.bottom-star.top-star.bottom)/2)<=4,after:star.left>=text.right-1,inside:star.right<=box.right+1};
 }));
 assert(result.length>0);for(const row of result)assert(row.sameLine&&row.after&&row.inside,JSON.stringify(row));
}
export async function formFields(page){
 const profiles=sourceAudit();assert.equal(profiles.reduce((sum,item)=>sum+item.captions.length,0),8);
 await page.locator('#lt-system-nav').click();await page.locator('[data-system-route="#system-core-links"]').click();await page.locator('[data-klc-edit]').first().click();
 for(const width of [1920,390,320]){await page.setViewportSize({width,height:1000});await checkCaptions(page.locator('#klc-editor'));assert(await page.locator('#klc-editor').evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:fileURLToPath(new URL('../../outputs/field-label-core-link.png',import.meta.url))});await page.locator('#klc-editor [data-klc-close]').first().click();
 await page.locator('[data-system-route="#system-cost-efficiency"]').click();assert.equal(await page.locator('#cec-editor,[data-cec-view]').count(),0);
 // 同一公共样式同时覆盖采购指派、项目及品质风险等动态表单的实际字段标题写法。
 await page.evaluate(profiles=>{const dialog=document.createElement('dialog');dialog.id='field-label-audit';dialog.style.cssText='box-sizing:border-box;width:min(720px,calc(100vw - 32px));max-width:calc(100vw - 32px);padding:16px;border:0';dialog.innerHTML=profiles.map(({layout,captions})=>'<div class="'+layout+'">'+captions.map(caption=>caption+'<input value="检查字段" required></label>').join('')+'</div>').join('');document.body.append(dialog);dialog.showModal()},profiles);
 for(const width of [1920,390,320]){await page.setViewportSize({width,height:1000});await checkCaptions(page.locator('#field-label-audit'));}
 await page.evaluate(()=>document.querySelector('#field-label-audit').remove());
}
