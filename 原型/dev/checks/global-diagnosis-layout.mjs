
import assert from 'node:assert/strict';
// 其他工作区模块已有独立宽表；同时检查本区域边界和它对整页宽度的增量。
export async function globalDiagnosisWidth(page,label){
 const size=await page.evaluate(()=>{const e=document.querySelector('#ai'),value=e.style.getPropertyValue('display'),priority=e.style.getPropertyPriority('display');e.style.setProperty('display','none','important');const baseline=document.documentElement.scrollWidth;e.style.removeProperty('display');if(value)e.style.setProperty('display',value,priority);const r=e.getBoundingClientRect();return {baseline,page:document.documentElement.scrollWidth,viewport:innerWidth,left:r.left,right:r.right,scroll:e.scrollWidth,client:e.clientWidth}});
 assert(size.left>=-2&&size.right<=size.viewport+2,'总诊断边界溢出 '+label);assert(size.scroll<=size.client+2,'总诊断内部溢出 '+label);assert(size.page<=Math.max(size.baseline,size.viewport)+2,'总诊断造成整页新增溢出 '+label);
}
