import {checkPlan} from './check-plan.mjs';
import {checkSession} from './check-session.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const require=createRequire(import.meta.url);
function playwright(){
 const paths=[process.env.DASHBOARD_PLAYWRIGHT_PATH,'playwright',path.resolve(path.dirname(process.execPath),'../node_modules/playwright')].filter(Boolean);
 for(const location of paths)try{return require(location)}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error}
 throw new Error('找不到Playwright；使用Codex内置Node运行，或设置DASHBOARD_PLAYWRIGHT_PATH。');
}
export async function checkBrowser(root,scope='smoke'){
 const plan=scope?.names?scope:checkPlan(root,Array.isArray(scope)?scope:[scope]);
 if(plan.planOnly){console.log('将检查：'+plan.names.join('、'));return}
 return checkSession(root,plan,names=>runBrowserChecks(root,plan,names));
}
async function runBrowserChecks(root,plan,names){
 const checks={};
 for(const name of names){
  const entry=plan.catalog[name],module=await import(new URL(entry.file,import.meta.url));
  if(typeof module[entry.export]!=='function')throw new Error('检查函数不存在：'+name);
  checks[name]=page=>module[entry.export](page,...(entry.args||[]));
 }
 const start=performance.now(),edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 const executablePath=process.env.DASHBOARD_BROWSER_PATH||(fs.existsSync(edge)?edge:undefined);
 const browser=await playwright().chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const errors=[],results=[];
 const target=process.env.DASHBOARD_TEST_URL||pathToFileURL(path.join(root,'index.html')).href;
 try{
  // 日期检查会安装模拟时钟；每项使用独立上下文，防止时钟、存储和抽屉串扰。
  for(const name of [...new Set(names)]){
   const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
   try{
    const page=await context.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(target,{waitUntil:'domcontentloaded'});
    await page.locator('#riskrail .rp-entry').first().waitFor({state:'attached',timeout:30000});
    await checks[name](page);results.push({name,status:'passed'});console.log('通过：'+name);
   }catch(error){results.push({name,status:'failed',message:error.message,stack:error.stack});console.error('失败：'+name+' '+error.stack);if(!process.env.DASHBOARD_CONTINUE_CHECKS)throw error}finally{await context.close()}
  }
  if(process.env.DASHBOARD_CHECK_REPORT){const folder=path.resolve(root,'../outputs/performance');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,path.basename(process.env.DASHBOARD_CHECK_REPORT)+'.json'),JSON.stringify({target,results,errors},null,2))}
  if(results.some(result=>result.status==='failed'))throw new Error('业务回归未全部通过');
  if(errors.length)throw new Error('页面异常：'+errors.join('\n'));
  console.log('检查完成：'+((performance.now()-start)/1000).toFixed(2)+'秒（单浏览器，无预览面板）');
  for(const note of plan.notes)console.log('本次自动检查未覆盖：'+note);
 }finally{await browser.close()}
}
