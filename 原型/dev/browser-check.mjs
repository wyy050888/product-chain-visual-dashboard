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
 const registry=JSON.parse(fs.readFileSync(path.join(root,'dev/areas.json'),'utf8')),checks={inventoryControl,shopFilters,shopConfig,lifecycleTargets,lifecycleProjectLinks,salesSort,projectRiskDetail,projectRiskEvents,projectDates,projectAnalysis,columnResize,projectPanorama,aiSummary,multiFilters,newProducts,shopDetail,salesCards,smoke,filters,risk,periodPerformance,detailOperating,detailQualityTodos};
 const names=scope==='all'?Object.keys(checks):scope==='smoke'?['smoke']:registry[scope]?.checks;
 if(!names)throw new Error('未知检查范围：'+scope);
 const start=performance.now(),edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 const executablePath=process.env.DASHBOARD_BROWSER_PATH||(fs.existsSync(edge)?edge:undefined);
 const browser=await playwright().chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  // 每项检查从初始页面开始，避免上一项遗留的抽屉或筛选影响后续检查。
  let firstCheck=true;
  for(const name of [...new Set(names)]){if(!firstCheck)await page.reload();firstCheck=false;await checks[name](page);console.log('通过：'+name)}
  if(errors.length)throw new Error('页面异常：'+errors.join('\n'));
  console.log('检查完成：'+((performance.now()-start)/1000).toFixed(2)+'秒（单浏览器，无预览面板）');
  for(const note of registry[scope]?.manual||[])console.log('本次自动检查未覆盖：'+note);
 }finally{await browser.close()}
}
