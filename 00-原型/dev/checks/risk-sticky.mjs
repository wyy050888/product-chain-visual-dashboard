import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function scroll(page,top){await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),top);await frames(page)}
async function position(page){return page.evaluate(()=>{
 const risk=document.querySelector('#risk'),head=risk.querySelector(':scope>.sectionhead'),ai=document.querySelector('#ai>.sectionhead h2'),row=risk.querySelector('.rp-entry');
 const rect=node=>node.getBoundingClientRect();
 return {top:rect(head).top,bottom:rect(head).bottom,navBottom:rect(document.querySelector('.navigation-toolbar')).bottom,aiTop:rect(ai).top,aiDocumentTop:rect(ai).top+scrollY,viewport:innerHeight,ended:risk.dataset.moduleStickyEnded,position:getComputedStyle(head).position,rowDocumentTop:rect(row).top+scrollY,sectionHeight:rect(risk).height,riskDocumentBottom:rect(risk).bottom+scrollY};
})}
async function stuck(page){await page.waitForFunction(()=>{const head=document.querySelector('#risk>.sectionhead').getBoundingClientRect(),nav=document.querySelector('.navigation-toolbar').getBoundingClientRect();return Math.abs(head.top-nav.bottom)<1});}
export async function riskSticky(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
 const originalHead=await page.locator('#risk>.sectionhead').elementHandle();
 for(const width of [1920,1280,390,320]){
  await page.setViewportSize({width,height:width<700?844:1080});await scroll(page,0);
  await page.waitForFunction(()=>document.querySelector('#risk').dataset.moduleStickyEnded==='false');
  const initial=await position(page);assert(initial.top>initial.navBottom,'初始位置自然排版');
  await scroll(page,240);await stuck(page);const middle=await position(page);
  assert.equal(middle.position,'sticky');assert.equal(middle.rowDocumentTop,initial.rowDocumentTop,'吸顶不改变榜单文档位置');
  const button=await page.locator('#rp-group-navigation button').first().boundingBox();
  assert(button.y>=middle.top&&button.y+button.height<=middle.bottom+1,'榜单快捷定位随标题栏吸顶');
  const before=middle.aiDocumentTop-middle.viewport-20;await scroll(page,before);await stuck(page);
  assert((await position(page)).aiTop>=middle.viewport,'AI标题未入屏时仍吸顶');
  await scroll(page,before+28);await stuck(page);
  assert.equal((await position(page)).position,'sticky','AI刚入屏时仍可在预警模块内定位');
  await scroll(page,middle.riskDocumentBottom-middle.navBottom+2);
  await page.waitForFunction(()=>document.querySelector('#risk').dataset.moduleStickyEnded==='true');
  const ended=await position(page);
  assert.notEqual(ended.position,'sticky');assert(ended.bottom<ended.navBottom,'离开预警模块后释放标题栏');
  assert.equal(ended.rowDocumentTop,initial.rowDocumentTop,'结束吸顶不造成内容跳动');assert.equal(ended.sectionHeight,initial.sectionHeight);
  await scroll(page,middle.aiDocumentTop-middle.navBottom);
  assert.equal((await position(page)).ended,'true','AI标题继续向上滚出时仍保持结束状态');
  await scroll(page,middle.aiDocumentTop+middle.viewport+20);
  assert.equal((await position(page)).ended,'true','快速跳过AI标题后保持结束');
  await scroll(page,before);
  await page.waitForFunction(()=>document.querySelector('#risk').dataset.moduleStickyEnded==='false');await stuck(page);
  await scroll(page,0);assert(Math.abs((await position(page)).top-initial.top)<1,'向上返回时恢复原位');
 }
 await page.setViewportSize({width:1920,height:1080});await scroll(page,240);await stuck(page);
 const jump=page.locator('#rp-group-navigation [data-rp-group-jump="3"]');
 await jump.click();await stuck(page);
 assert.equal(await jump.getAttribute('aria-current'),'location','吸顶状态仍能使用榜单快捷定位');
 assert(await originalHead.evaluate(node=>node===document.querySelector('#risk>.sectionhead')),'定位保留原标题节点');
 await page.evaluate(()=>document.documentElement.classList.add('dashboard-fullscreen'));await stuck(page);
 assert(Math.abs((await position(page)).navBottom-52)<2,'模拟全屏样式后贴合模块导航');
 await page.evaluate(()=>document.documentElement.classList.remove('dashboard-fullscreen'));await stuck(page);
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/risk-sticky-mid.png',import.meta.url))});
 const base=page.url();await page.goto(new URL('项目部.html',base).href);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await scroll(page,240);
 assert.notEqual(await page.locator('#risk>.sectionhead').evaluate(node=>getComputedStyle(node).position),'sticky','项目部页面沿用原布局');
 console.log('吸顶：四宽度、AI入屏/反向恢复、无跳动、快捷定位、全屏及项目部隔离通过');
}
