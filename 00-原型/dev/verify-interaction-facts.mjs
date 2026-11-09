import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {interactionCases,applyMeasuredInteraction} from './interaction-cases.mjs';

// 同一份当前业务源代码内重放旧的提前展开、整块刷新和无条件文本写入方式。
// 仅替换本次测试页响应，不写入源文件或构建产物，不用于性能计时。
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=JSON.parse(read('manifest.json')),reference=JSON.parse(fs.readFileSync(path.resolve(root,'../outputs/performance/interactions-final-20261026.json'),'utf8'));
let replacements=0;
const modules=manifest.scripts.map(({file})=>{
 let code=read(file);
 if(file==='src/modules/performance/01-cache.js'){
  const original='return Object.defineProperties({},Object.assign({},...sources.map(source=>Object.getOwnPropertyDescriptors(source))));';
  assert(code.includes(original));code=code.replace(original,'return Object.assign({},...sources);');replacements++;
 }
 const legacy={
  'src/modules/performance/02-layout.js':[['if(previous?.markup===markup&&previous.first===host.firstChild)return false;','if(false)return false;']],
  'src/modules/risk-presentation/02-platforms.js':[['if(rpCardRowBatch)return read();','return read();']],
  'src/modules/risk-presentation/02-render.js':[['partial=Array.isArray(changedKinds)&&rail.querySelector(\'.rp-board-group\')','partial=false']],
  'src/modules/supplier-planning/03-view.js':[['function scpRender(scope=null){','function scpRender(scope=null){scope=null;']],
  'src/modules/period/01.js':[['if(node.textContent!==text)node.textContent=text','node.textContent=text'],["if(n.getAttribute('aria-label')!==label)n.setAttribute('aria-label',label)","n.setAttribute('aria-label',label)"]]
 };
 for(const [current,before] of legacy[file]||[]){assert(code.includes(current),file+' 对照入口缺失');code=code.replace(current,before);replacements++}
 return code;
}).join('');
assert.equal(replacements,7);
const script=read('src/runtime/open.js')+'const drawerPreviewCss = '+JSON.stringify(manifest.styles.map(({file})=>read(file)).join('\n'))+';\nconst dashboardPages = '+JSON.stringify(manifest.pages)+';\n'+modules+read('src/runtime/close.js');
const require=createRequire(import.meta.url),{chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH||path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],samples=[];let served=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/assets/app.js*',route=>{served++;return route.fulfill({contentType:'text/javascript; charset=utf-8',body:script})});
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 let module='';
 for(const step of interactionCases){
  if(module!==step.module){module=step.module;await page.locator('.jumpnav a[href="#'+module+'"]').evaluate(node=>node.click());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
  await applyMeasuredInteraction(page,step);
  const text=await page.locator('#'+module).evaluate(node=>node.textContent.replace(/\s+/g,' ').trim());
  const signature=createHash('sha256').update(text).digest('hex').slice(0,16),expected=reference.runs[0].samples.find(sample=>sample.id===step.id);
  samples.push({id:step.id,signature,expected:expected.signature,equal:signature===expected.signature,...(signature!==expected.signature?{text}: {})});
 }
 if(samples.some(sample=>!sample.equal)){
  const current=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});await current.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await current.goto(pathToFileURL(path.join(root,'index.html')).href);await current.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  module='';
  for(const step of interactionCases){
   if(module!==step.module){module=step.module;await current.locator('.jumpnav a[href="#'+module+'"]').evaluate(node=>node.click());await current.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
   await applyMeasuredInteraction(current,step);
   const sample=samples.find(sample=>sample.id===step.id);if(!sample.equal){
    const text=await current.locator('#'+module).evaluate(node=>node.textContent.replace(/\s+/g,' ').trim());
    sample.currentText=text;const i=[...sample.text].findIndex((char,index)=>char!==text[index]);
    console.log(JSON.stringify({id:step.id,index:i,eager:sample.text.slice(Math.max(0,i-100),i+180),lazy:text.slice(Math.max(0,i-100),i+180)}));
   }
   if(step.id==='risk-season-all')break;
  }
 }
 const result={served,errors,samples,equal:samples.every(sample=>sample.equal)};
 fs.writeFileSync(path.resolve(root,'../outputs/performance/interaction-facts-equivalence-20261026.json'),JSON.stringify(result,null,2));
 assert.equal(served,1);assert.deepEqual(errors,[]);assert(result.equal,'旧展开方式与按需方式出现数据差异：'+samples.filter(s=>!s.equal).map(s=>s.id).join(','));
 console.log('同源64项事件：提前展开与按需展开的全部模块文本指纹一致');
}finally{await browser.close()}
