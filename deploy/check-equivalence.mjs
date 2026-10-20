import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const directory=new URL('../outputs/performance/',import.meta.url);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const records={};
async function snapshot(page){
 return page.evaluate(()=>{
  const root=document.querySelector('.page');
  return {text:root.innerText,items:[...root.querySelectorAll('*')].filter(el=>el.getClientRects().length).map(el=>{
   const box=el.getBoundingClientRect(),s=getComputedStyle(el);
   return {tag:el.tagName,id:el.id,cls:el.className,box:[box.x,box.y,box.width,box.height].map(n=>Math.round(n*100)/100),styles:[s.display,s.color,s.backgroundColor,s.fontSize,s.fontWeight,s.borderRadius,s.padding,s.gap]};
  })};
 });
}
try{
 for(const variant of ['baseline','candidate']){
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-19T04:00:00Z'));
  await page.goto('http://127.0.0.1:8931/'+variant+'/');
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  records[variant]={home:await snapshot(page)};
  await page.locator('#riskrail [data-risk="0"]').click();
  await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
  assert.equal(await page.locator('.drawer-parent-layer').count(),1,'二层抽屉有背景快照');
  await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(img=>!img.getAttribute('src')||(img.complete&&img.naturalWidth>0)));
  records[variant].nested=await page.locator('#dialog').evaluate(el=>({text:el.innerText,box:[el.offsetWidth,el.offsetHeight]}));
  await page.screenshot({path:fileURLToPath(new URL('nested-'+variant+'.png',directory)),animations:'disabled'});
  assert.deepEqual(errors,[]);await context.close();
 }
 assert.deepEqual(records.candidate.home,records.baseline.home,'首屏业务文本、可见元素位置及关键样式一致');
 assert.deepEqual(records.candidate.nested,records.baseline.nested,'二层详情内容和尺寸一致');
 assert.deepEqual(fs.readFileSync(new URL('nested-candidate.png',directory)),fs.readFileSync(new URL('nested-baseline.png',directory)),'二层抽屉及背景截图像素一致');
 fs.writeFileSync(new URL('equivalence.json',directory),JSON.stringify({status:'passed',visibleElements:records.candidate.home.items.length,nestedShadow:true},null,2));
 console.log('通过：优化前后首屏文本、'+records.candidate.home.items.length+'个可见元素位置/样式、二层抽屉内容和尺寸一致。');
}finally{await browser.close()}
