import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const require=createRequire(import.meta.url),{chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),before=url.pathname.startsWith('/before/');
  const base=before?path.join(root,'outputs/image-quality-before'):root;
  const relative=decodeURIComponent(url.pathname.replace(/^\/(before|after)\//,''));
  const file=path.resolve(base,relative||'index.html');
  if(!file.startsWith(base+path.sep))throw Error('outside root');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','public,max-age=3600');res.end(fs.readFileSync(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const results=[];
try{
 for(let run=0;run<3;run++)for(const version of ['before','after']){
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(version,e.stack)});
  const session=await context.newCDPSession(page);await session.send('Performance.enable');
  await page.goto(base+'/'+version+'/index.html',{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready')}catch(e){console.error('Boot state',await page.evaluate(()=>({state:document.documentElement.dataset.dashboardBoot,text:document.body.innerText.slice(-1500)})));throw e}
  await page.waitForFunction(()=>[...document.querySelectorAll('#riskrail img')].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(i=>i.complete&&i.naturalWidth>0));
  await page.waitForTimeout(300);
  const metrics=Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const result=await page.evaluate(()=>{
   const resources=performance.getEntriesByType('resource');
   const images=resources.filter(r=>r.initiatorType==='img');
   return {images:images.length,imageBytes:images.reduce((n,r)=>n+r.encodedBodySize,0),totalBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:Math.round(p.startTime)})),fullRequests:images.filter(r=>r.name.endsWith('-full.webp')).length,
    visibleImages:[...document.querySelectorAll('#riskrail img.risk-thumb')].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>({alt:i.alt,src:i.currentSrc,width:i.naturalWidth,resourcePixels:Number(i.currentSrc.match(/-(\d+)\.webp/)?.[1]||i.naturalWidth),display:i.clientWidth,full:i.dataset.productFull}))};
  });
  Object.assign(result,{version,run,scriptMs:Math.round(metrics.ScriptDuration*1000),layoutMs:Math.round(metrics.LayoutDuration*1000),errors});assert.deepEqual(errors,[]);
  if(version==='after'){
   assert.equal(result.fullRequests,0,'大图只能在点击后请求');
   const replaced=result.visibleImages.filter(i=>i.full);assert(replaced.length>=10);assert(replaced.every(i=>i.resourcePixels>=112));
   if(run===0){
    const catalog=vm.runInNewContext(fs.readFileSync(path.join(root,'src/data/product-media.js'),'utf8')+';productMediaAssets');
    const spuPaths=Object.entries(catalog).filter(([key])=>key.startsWith('assets/spu-images/')).map(([,value])=>'assets/product-media/'+value[0]+'-224.webp');
    assert.equal(spuPaths.length,39);
    const decoded=await page.evaluate(async paths=>Promise.all(paths.map(async src=>{const image=new Image();image.src=src;await image.decode();return image.naturalWidth})),spuPaths);
    assert(decoded.every(width=>width===224),'全部39张高清缩略图必须可解码');
    result.verifiedSpus=decoded.length;
    const retinaContext=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:3,reducedMotion:'reduce'});
    try{
     const retinaPage=await retinaContext.newPage();await retinaPage.goto(base+'/after/index.html',{waitUntil:'domcontentloaded'});
     await retinaPage.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
     await retinaPage.waitForFunction(()=>document.querySelector('#riskrail img[data-product-full]')?.currentSrc.endsWith('-224.webp'));
     result.verifiedDpr=await retinaPage.evaluate(()=>devicePixelRatio);
    }finally{await retinaContext.close();}
    await page.screenshot({path:path.join(root,'outputs/image-quality-overview.png')});
    const thumb=page.locator('#riskrail img[data-product-full]').first();
    await thumb.click();const viewer=page.locator('#product-image-viewer');await assert.doesNotReject(()=>viewer.waitFor({state:'visible'}));
    await viewer.locator('img').evaluate(i=>i.decode());
    const full=await viewer.locator('img').evaluate(i=>({src:i.currentSrc,width:i.naturalWidth}));
    assert.match(full.src,/-full\.webp$/);assert(full.width>112);
    await page.screenshot({path:path.join(root,'outputs/image-quality-viewer.png')});
    await page.keyboard.press('Escape');assert.equal(await viewer.evaluate(e=>e.open),false);
    await page.locator('#riskrail [data-risk="0"]').click();
    await page.locator('#dialogbody img[data-product-full]').first().waitFor();
    const list=await page.locator('#dialogbody img[data-product-full]').first().evaluate(i=>({sizes:i.sizes,decode:i.decoding,loading:i.loading}));
    assert.equal(list.decode,'async');assert.equal(list.loading,'lazy');await page.locator('#close').click();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.page').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    await page.screenshot({path:path.join(root,'outputs/image-quality-mobile.png')});
    result.viewer=full;result.list=list;
   }
  }
  results.push(result);console.log(JSON.stringify({version,run,images:result.images,imageKB:Math.round(result.imageBytes/1024),totalKB:Math.round(result.totalBytes/1024),scriptMs:result.scriptMs,layoutMs:result.layoutMs}));
  await context.close();
 }
 assert(results.filter(r=>r.version==='after').every(r=>r.imageBytes<100*1024),'首页图片应控制在100KB以内');
 assert(results.filter(r=>r.version==='after').every(r=>r.imageBytes<results.find(b=>b.version==='before'&&b.run===r.run).imageBytes));
 fs.writeFileSync(path.join(root,'outputs/image-quality-performance.json'),JSON.stringify({viewport:[1920,1080],dpr:2,results},null,2));
 console.log('图片清晰度、按需大图、抽屉、窄屏与三轮加载对比通过。');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
