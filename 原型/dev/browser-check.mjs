import {globalDiagnosisConsistency} from './checks/global-diagnosis-consistency.mjs';
import {dynamicDates} from './checks/dynamic-dates.mjs';
import {globalDiagnosisTodoSync} from './checks/global-diagnosis-todo-sync.mjs';
import {aiBusinessFollowup} from './checks/key-products-ai-followup.mjs';
import {drawerSummary} from './checks/drawer-summary.mjs';
import {keyProductSidebar} from './checks/key-products-sidebar.mjs';
import {newProductPrices} from './checks/new-products-price.mjs';
import {keyProductPrice} from './checks/key-products-price.mjs';
import {globalDiagnosisFocus} from './checks/global-diagnosis-focus.mjs';
import {matrixZoomFilters} from './checks/key-products-zoom-filters.mjs';
import {coreLinks} from './checks/core-links.mjs';
import {globalDiagnosisControls} from './checks/global-diagnosis-controls.mjs';
import { productManagement } from './checks/product-management.mjs';
import {globalDiagnosis} from './checks/global-diagnosis.mjs';
import {supplierTargets} from './checks/supplier-targets.mjs';
import {costConfig} from './checks/cost-config.mjs';
import {costControl} from './checks/cost-control.mjs';
import {supplierPlanning} from './checks/supplier-planning.mjs';
import { riskCardClick } from './checks/risk-card-click.mjs';
import { detailPeriod } from './checks/detail-period.mjs';
import { keyProducts } from './checks/key-products.mjs';
import { inventoryControl } from './checks/inventory-control.mjs';
import { shopFilters } from './checks/shop-filters.mjs';
import { shopConfig } from './checks/shop-config.mjs';
import { lifecycleTargets } from './checks/lifecycle-targets.mjs';
import { lifecycleProjectLinks } from './checks/lifecycle-project-links.mjs';
import { salesSort } from './checks/sales-sort.mjs';
import { projectRiskDetail } from './checks/project-risk-detail.mjs';
import { projectRiskEvents } from './checks/project-risk-events.mjs';
import { projectDates } from './checks/project-dates.mjs';
import { projectAnalysis } from './checks/project-analysis.mjs';
import { projectPanorama } from './checks/project-panorama.mjs';
import { columnResize } from './checks/column-resize.mjs';
import { aiSummary } from './checks/ai-summary.mjs';
import { newProducts } from './checks/new-products.mjs';
import { multiFilters } from './checks/multi-filters.mjs';
import { shopDetail } from './checks/shop-detail.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { detailQualityTodos } from './checks/detail-quality-todos.mjs';
import { detailOperating } from './checks/detail-operating.mjs';
import { salesCards } from './checks/sales-cards.mjs';
import { smoke } from './checks/smoke.mjs';
import { filters } from './checks/filters.mjs';
import { risk } from './checks/risk.mjs';
import { periodPerformance } from './checks/period-performance.mjs';

const require=createRequire(import.meta.url);
function playwright(){
 const paths=[process.env.DASHBOARD_PLAYWRIGHT_PATH,'playwright',path.resolve(path.dirname(process.execPath),'../node_modules/playwright')].filter(Boolean);
 for(const location of paths)try{return require(location)}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error}
 throw new Error('找不到Playwright；使用Codex内置Node运行，或设置DASHBOARD_PLAYWRIGHT_PATH。');
}
export async function checkBrowser(root,scope){
 const registry=JSON.parse(fs.readFileSync(path.join(root,'dev/areas.json'),'utf8')),checks={globalDiagnosisConsistency,dynamicDates,globalDiagnosisTodoSync,aiBusinessFollowup,drawerSummary,keyProductSidebar,newProductPrices,keyProductPrice,globalDiagnosisFocus,matrixZoomFilters,coreLinks,productManagement,globalDiagnosisControls,globalDiagnosis,supplierTargets,costConfig,costControl,supplierPlanning,riskCardClick,detailPeriod,keyProducts,inventoryControl,shopFilters,shopConfig,lifecycleTargets,lifecycleProjectLinks,salesSort,projectRiskDetail,projectRiskEvents,projectDates,projectAnalysis,columnResize,projectPanorama,aiSummary,multiFilters,newProducts,shopDetail,salesCards,smoke,filters,risk,periodPerformance,detailOperating,detailQualityTodos};
 const names=process.env.DASHBOARD_CHECK_NAMES?.split(',')||(scope==='all'?Object.keys(checks):scope==='smoke'?['smoke']:registry[scope]?.checks);
 if(!names)throw new Error('未知检查范围：'+scope);
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
    await checks[name](page);results.push({name,status:'passed'});console.log('通过：'+name);
   }catch(error){results.push({name,status:'failed',message:error.message,stack:error.stack});console.error('失败：'+name+' '+error.stack);if(!process.env.DASHBOARD_CONTINUE_CHECKS)throw error}finally{await context.close()}
  }
  if(process.env.DASHBOARD_CHECK_REPORT){const folder=path.resolve(root,'../outputs/performance');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,path.basename(process.env.DASHBOARD_CHECK_REPORT)+'.json'),JSON.stringify({target,results,errors},null,2))}
  if(results.some(result=>result.status==='failed'))throw new Error('业务回归未全部通过');
  if(errors.length)throw new Error('页面异常：'+errors.join('\n'));
  console.log('检查完成：'+((performance.now()-start)/1000).toFixed(2)+'秒（单浏览器，无预览面板）');
  for(const note of registry[scope]?.manual||[])console.log('本次自动检查未覆盖：'+note);
 }finally{await browser.close()}
}
