import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {acquireProcessLock} from '../00-原型/dev/process-lock.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH||path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const [folder,baseUrl]=process.argv.slice(2);
if(!folder||!baseUrl)throw Error('用法：verify-release.mjs 固定发布目录 检查地址');
const root=path.resolve(folder),release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../00-原型/manifest.json',import.meta.url),'utf8'));
const entries=manifest.pages,core=new Set([...entries.map(p=>p.file),release.build.jsPath,release.build.cssPath,'数智罗盘/店铺配置.html','数智罗盘/目标管理/目标管理.html','src/data/filter-catalog.js']);
const lease=await acquireProcessLock(fileURLToPath(new URL('../00-原型/',import.meta.url)),'browser-check',{onWait:()=>console.log('等待共享浏览器验证锁')});
const browser=await chromium.launch({headless:true,args:['--disable-quic'],executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],report={baseUrl,checkedAt:new Date().toISOString(),files:[],entries:[]};
const retry=async task=>{let error;for(let i=0;i<3;i++)try{return await task()}catch(e){error=e}throw error};
try{
 for(const file of release.files.filter(f=>core.has(f.path))){
  await retry(async()=>{const response=await context.request.get(new URL(file.path,baseUrl).href,{timeout:45000});assert.equal(response.status(),200,file.path);const bytes=await response.body();assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,'线上文件与固定包一致：'+file.path)});
  report.files.push(file.path);
 }
 assert.equal(report.files.length,core.size,'所有主入口、共用资源及独立配置入口均已核对');
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const entry of entries){
  await retry(()=>page.goto(new URL(entry.file,baseUrl).href,{waitUntil:'domcontentloaded',timeout:45000}));
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:45000});
  assert.equal(await page.locator('html').getAttribute('data-dashboard-view'),entry.view);
  if(entry.view==='director'){
   await page.locator('#lt-system-nav').click();assert.equal(new URL(page.url()).hash,'#system-business-rules');
   const data=await page.evaluate(()=>businessRuleConfigSnapshot());
   assert.deepEqual(data.successTimeline.quarter.map(r=>r.from),['2026-Q1']);assert.deepEqual(data.successTimeline.year.map(r=>r.from),['2026']);
   report.systemDefault='规则配置';report.successDefaults={quarter:'2026-Q1',year:'2026'};
   await page.locator('img[src]').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
   await page.waitForFunction(()=>[...document.querySelectorAll('img[src]')].filter(i=>i.getAttribute('src').trim()).every(i=>i.complete&&i.naturalWidth>0),null,{timeout:60000});
   report.images={elements:await page.locator('img[src]').count(),broken:0};
  }
  report.entries.push(entry.file);
 }
 assert.deepEqual(errors,[],'所有入口无页面脚本错误');report.scriptErrors=0;report.status='passed';
 fs.writeFileSync(path.join(root,baseUrl.startsWith('http://127.')?'local-verification.json':'online-verification.json'),JSON.stringify(report,null,2));
 console.log('通过：'+report.files.length+'个核心文件哈希、'+report.entries.length+'个页面入口、系统管理默认规则、新品两条默认规则；图片'+report.images.elements+'个正常，脚本错误0。');
}finally{try{await context.close();await browser.close()}finally{lease.release()}}
