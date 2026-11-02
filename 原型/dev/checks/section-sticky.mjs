import assert from 'node:assert/strict';
const ids=['risk','ai','sales','new','projects','lifecycle','matrix','inventory','suppliers','cost'];
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function scroll(page,top){await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),top);await frames(page)}
async function measure(page,id){return page.evaluate(id=>{
 const section=document.getElementById(id),head=section.querySelector(':scope>.sectionhead'),rect=node=>node.getBoundingClientRect();
 const content=[...section.children].find(node=>node!==head&&rect(node).height>0),s=rect(section),h=rect(head),nav=rect(document.querySelector('.navigation-toolbar'));
 return {top:h.top,bottom:h.bottom,height:h.height,width:h.width,nav:nav.bottom,documentTop:s.top+scrollY,sectionHeight:s.height,contentTop:rect(content).top+scrollY,position:getComputedStyle(head).position,
 controls:[...head.querySelectorAll('button,select,input')].filter(node=>!node.closest('.pf-multi-menu,[popover],[role="dialog"]')&&rect(node).height>0&&getComputedStyle(node).visibility==='visible').every(node=>rect(node).top>=h.top-1&&rect(node).bottom<=h.bottom+1)};
 },id)}
export async function sectionSticky(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
 assert.deepEqual(await page.locator('main.page>[data-module-sticky]').evaluateAll(es=>es.map(e=>e.id)),ids);
 const original=await page.locator('#sales>.sectionhead').elementHandle();
 for(const width of [1920,1280,390]){
  // 600px高度保证最末模块也有足够页面滚动空间，不为吸顶人为增加页面留白。
  await page.setViewportSize({width,height:600});await scroll(page,0);
  for(let i=0;i<ids.length;i++){
   const id=ids[i],before=await measure(page,id),target=before.documentTop-before.nav+80;
   await scroll(page,target);const stuck=await measure(page,id);
   assert.equal(stuck.position,'sticky',id+'启用吸顶 '+width);
   assert(Math.abs(stuck.top-stuck.nav)<1.5,id+'标题贴合导航底部 '+width+': '+JSON.stringify(stuck));
   assert(stuck.controls,id+'期间/按钮位于原标题栏内');
   assert.equal(stuck.contentTop,before.contentTop,id+'吸顶不移动内容');
   assert.equal(stuck.sectionHeight,before.sectionHeight,id+'吸顶不增加模块高度');
   const overlap=await page.locator('main.page>[data-module-sticky]:not([hidden])>.sectionhead').evaluateAll(es=>{const bottom=document.querySelector('.navigation-toolbar').getBoundingClientRect().bottom;return es.filter(e=>{const r=e.getBoundingClientRect();return r.top<=bottom+1&&r.bottom>bottom+2}).length});
   assert.equal(overlap,1,id+'同一位置只有一条标题栏');
   if(i>0&&i<ids.length-1){
    const next=await measure(page,ids[i+1]);await scroll(page,next.documentTop-stuck.nav+4);
    const released=await measure(page,id);assert(released.bottom<=released.nav+1,id+'在模块末尾释放');
    await scroll(page,target);assert(Math.abs((await measure(page,id)).top-stuck.nav)<1.5,id+'反向滚动恢复');
   }
  }
  console.log('通过：十模块吸顶/交接/反向恢复、内容不跳动、控件完整 '+width+'px');
 }
 await page.setViewportSize({width:1920,height:900});await frames(page);
 for(const id of ids){await page.locator('.jumpnav a[href="#'+id+'"]').click();await frames(page);const p=await measure(page,id);assert(p.top>=p.nav-1,id+'锚点不被导航遮住')}
 const sales=await measure(page,'sales');await scroll(page,sales.documentTop-sales.nav+80);
 await page.locator('#sales [data-time-mode="quarter"]').click();await frames(page);
 assert(await original.evaluate(node=>node===document.querySelector('#sales>.sectionhead')),'期间切换仍使用原标题与控件节点');
 assert(Math.abs((await measure(page,'sales')).top-(await measure(page,'sales')).nav)<1.5,'期间重绘保持吸顶');
 await page.evaluate(()=>document.documentElement.classList.add('dashboard-fullscreen'));await frames(page);
 const full=await measure(page,'sales');assert(Math.abs(full.top-full.nav)<1.5);assert(Math.abs(full.nav-52)<2,'全屏样式下贴合实际导航');
 await page.evaluate(()=>document.documentElement.classList.remove('dashboard-fullscreen'));await frames(page);
 await scroll(page,0);await page.setViewportSize({width:1920,height:1080});
 console.log('通过：十模块锚点、原标题保留、期间切换及模拟全屏');
}
