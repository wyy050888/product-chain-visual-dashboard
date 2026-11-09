import assert from 'node:assert/strict';

// 验证真正到位，而非只量点击处理耗时；全局Tab不应等待长距离滚动动画。
export async function navigationPerformance(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const samples=[];
 for(const id of ['cost','risk','matrix','new','projects','sales','lifecycle','inventory','suppliers','ai','risk']){
  const result=await page.evaluate(id=>new Promise(resolve=>{
   const start=performance.now();document.querySelector('.jumpnav a[href="#'+id+'"]').click();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const top=document.getElementById(id).getBoundingClientRect().top,header=document.querySelector('.navigation-toolbar').getBoundingClientRect().bottom;
    resolve({id,ms:performance.now()-start,top,header,atEnd:scrollY+innerHeight>=document.documentElement.scrollHeight-1,viewport:innerHeight,hash:location.hash,current:document.querySelector('.jumpnav [aria-current="location"]')?.hash});
   }));
  }),id);
  assert.equal(result.hash,'#'+id);assert.equal(result.current,'#'+id);
  assert(result.top>=result.header-2&&(result.top<=result.header+60||(id==='cost'&&result.atEnd&&result.top<result.viewport-60)),'目标模块应在两帧内到位，末模块允许受页面底部限制：'+JSON.stringify(result));
  assert(result.ms<500,'全局Tab响应不能进入秒级阻塞：'+JSON.stringify(result));samples.push(Math.round(result.ms));
 }
 await page.locator('.jumpnav a[href="#new"]').click();await page.locator('.jumpnav a[href="#projects"]').click();
 await page.goBack();assert.equal(new URL(page.url()).hash,'#new','锚点保留浏览器返回历史');
 await page.setViewportSize({width:390,height:844});await page.locator('.jumpnav a[href="#risk"]').evaluate(link=>link.click());
 await page.waitForFunction(()=>document.querySelector('.jumpnav [aria-current="location"]')?.hash==='#risk');
 assert.equal(await page.locator('.page').evaluate(node=>node.scrollWidth>node.clientWidth+1),false);
 await page.setViewportSize({width:1920,height:1080});
 console.log('全局11次Tab点击至到位(ms)：'+samples.join(' / '));
}
