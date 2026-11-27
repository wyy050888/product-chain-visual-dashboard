import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {weeklyReportSampleFiles} from '../prototype-ai-prompts.mjs';

export async function qualityDirector(page){
 await page.clock.setFixedTime(new Date('2026-11-26T04:00:00Z'));
 const sharedTitleHints=ids=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>{
  const header=document.querySelector(`#${id} > .sectionhead`);
  const hints=[...header.querySelectorAll('.sub, .note, .tag, .metric-help')];
  return [id,hints.filter(hint=>hint.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})).map(hint=>hint.classList.contains('metric-help')?'问号':hint.textContent.trim()).filter(Boolean)];
 })),ids);
 const matrixHeaderStyles=()=>page.locator('#matrix > .sectionhead').evaluate(header=>{
  const style=getComputedStyle(header),title=getComputedStyle(header.querySelector('h2'));
  return [style.minHeight,style.paddingInlineStart,style.marginInlineStart,title.fontSize,title.fontWeight,title.lineHeight];
 });
 const referenceHeader=await matrixHeaderStyles();
 const referenceUrl=page.url();
 const globalModules=['risk','new','projects','matrix','cost'],productModules=['ai','lifecycle'];
 const globalHints=await sharedTitleHints(globalModules);
 await page.goto(new URL('产品中心.html',referenceUrl).href);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const productHints=await sharedTitleHints(productModules);
 await page.goto(new URL('品质中心.html',referenceUrl).href);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const home=page.locator('#quality-department');
 const chooser=home.getByRole('button',{name:/切换品质中心看板/});
 const nav=home.getByRole('navigation',{name:'品质中心模块导航'});
 const rules=home.getByRole('button',{name:'配置全局规则',exact:true});
 const fullscreen=home.locator('#dashboard-fullscreen');
 const [chooserBounds,navBounds,rulesBounds,fullscreenBounds]=await Promise.all([chooser,nav,rules,fullscreen].map(control=>control.boundingBox()));
 assert(chooserBounds.x+chooserBounds.width<navBounds.x&&navBounds.x+navBounds.width<=rulesBounds.x&&rulesBounds.x+rulesBounds.width<fullscreenBounds.x,'看板切换、模块标签和右侧操作按顺序排列');
 assert.equal(await chooser.evaluate(button=>getComputedStyle(button.parentElement).borderInlineEndWidth),'1px');
 await rules.click();await page.locator('#business-rule-page').waitFor({state:'visible'});
 await page.goBack();await home.waitFor({state:'visible'});
 // 无窗口浏览器模拟系统全屏状态，使用原有按钮处理器验证页面切换。
 await page.evaluate(()=>{
  let fullscreenElement=null;
  Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>fullscreenElement});
  const setFullscreen=async element=>{
   fullscreenElement=element;document.dispatchEvent(new Event('fullscreenchange'));
  };
  document.documentElement.requestFullscreen=()=>setFullscreen(document.documentElement);
  document.exitFullscreen=()=>setFullscreen(null);
 });
 await fullscreen.click();assert(await page.locator('.head.portal-header').isHidden());
 await home.getByRole('button',{name:'退出全屏展示',exact:true}).click();
 assert(await page.locator('.head.portal-header').isVisible());
 await page.evaluate(()=>{
  delete document.fullscreenElement;
  delete document.documentElement.requestFullscreen;
  delete document.exitFullscreen;
 });
 await chooser.click();
 const roles=home.getByRole('tablist',{name:'品质中心看板',exact:true}).getByRole('tab');
 assert.deepEqual(await roles.allTextContents(),['总监','PQM 品质链主','PQE 质改工程师','实验室工程师','SQE 供应商质量工程师','体系工程师']);
 assert.equal(await roles.first().getAttribute('aria-selected'),'true');
 const director=home.locator('#qc-board-director');
 assert.deepEqual(await matrixHeaderStyles(),referenceHeader);
 assert(await director.locator('#matrix .sectionhead .sub').isHidden());
 assert.deepEqual(await sharedTitleHints([...globalModules,...productModules]),{...globalHints,...productHints},'共用模块沿用对应看板的标题提示');
 assert.deepEqual(await nav.getByRole('link').allTextContents(),['风险预警','AI 总诊断','人员管理','新品专项','项目进度','成本收益','产品生命周期','关键产品','降本增效']);
 for(let i=1;i<6;i++){
  if(i>1)await chooser.click();
  const tab=roles.nth(i);
  const panel=home.locator('#'+await tab.getAttribute('aria-controls'));
  await tab.click();
  assert(await panel.isVisible());assert.equal(await panel.textContent(),'');assert(await director.isHidden());
 }
 await chooser.click();await roles.last().press('Home');await page.keyboard.press('Enter');assert(await director.isVisible());
 const riskRail=director.locator('#riskrail');
 assert.equal(await riskRail.locator('.rp-group-heading').count(),0);
 assert.deepEqual(await riskRail.locator('[data-rp-board]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpBoard)),['0','6','8','1']);
 const riskHeaderGap=await riskRail.locator('[data-rp-board="0"]').evaluate(board=>
  board.getBoundingClientRect().top-board.closest('#risk').querySelector('.sectionhead').getBoundingClientRect().bottom);
 assert(riskHeaderGap>=0&&riskHeaderGap<=20,'首个榜单应紧接风险预警标题区');
 await director.locator('#riskrail [data-risk="0"]').click();
 assert.deepEqual(await page.locator('#drawer-tabs [role="tab"]').allTextContents(),['产品违规榜','退货恶化榜','退货偏差榜','店铺风险榜']);
 await page.locator('#close').click();

 const ai=director.locator('#ai');
 assert.equal(await ai.locator('h2').textContent(),'品质中心 AI 总诊断');
 await ai.locator('[data-gd-part="execution"]').click();
 const table=ai.getByRole('table',{name:'部门周报下载表'});
 assert.deepEqual(await table.getByRole('columnheader').allTextContents(),['统计周','本周结果','最大风险','品质中心']);
 const report=table.getByRole('row').filter({has:page.getByRole('rowheader',{name:/第43周/})});
 assert.match(await report.textContent(),/首批检验 8 批/);assert.equal(await report.getByRole('listitem').count(),2);
 await report.getByRole('button',{name:/周报操作/}).click();
 await report.getByRole('menuitem',{name:'变更记录'}).click();
 const history=page.getByRole('dialog',{name:'变更记录'});
 assert.match(await history.textContent(),/AI生成/);
 const [download]=await Promise.all([page.waitForEvent('download'),history.getByRole('button',{name:'下载周报'}).click()]);
 const filename='品质中心第43周周报.pdf';
 assert.equal(download.suggestedFilename(),filename);
 const pdf=await readFile(weeklyReportSampleFiles().get(filename));
 assert((await readFile(await download.path())).equals(pdf));
 await history.getByRole('button',{name:'关闭',exact:true}).click();
 const ungenerated=table.getByRole('row').filter({has:page.getByRole('rowheader',{name:/第44周/})});
 await ungenerated.getByRole('button',{name:/周报操作/}).click();
 await ungenerated.getByRole('menuitem',{name:'上传周报'}).click();
 const upload=page.getByRole('dialog',{name:'上传周报'});
 await upload.locator('input[type="file"]').setInputFiles({name:'品质中心第44周周报.pdf',mimeType:'application/pdf',buffer:pdf});
 await upload.getByRole('button',{name:'上传',exact:true}).click();await upload.waitFor({state:'hidden'});
 assert.match(await ai.locator('[data-gd-part="execution"] .gd-card-stats').textContent(),/已上传第44周/);

 const management=director.locator('#qc-management');
 const scores=management.getByRole('tabpanel',{name:'人员评分'});
 const scoreTable=scores.getByRole('table');
 assert.deepEqual(await scoreTable.getByRole('columnheader').allTextContents(),['姓名/岗位','人员评分','周重点工作','下周计划','周工作偏差','操作']);
 const person=scoreTable.getByRole('row').filter({hasText:'尹太景'});
 if(!await person.count())await scores.getByRole('button',{name:'下一页'}).click();
 await person.getByRole('button',{name:'查看得分明细'}).click();
 assert.match(await page.locator('#dialogtitle').textContent(),/尹太景/);
 await page.locator('#close').click();
 await management.getByRole('tab',{name:'人员指标大盘'}).click();
 const metrics=management.getByRole('tabpanel',{name:'人员指标大盘'});
 assert.equal(await metrics.locator('thead th small').count(),0);
 assert(await metrics.getByRole('rowheader',{name:'王明洋'}).isVisible());
 const grid=metrics.getByRole('tabpanel',{name:'PQM 品质链主'}).getByRole('region',{name:'岗位指标明细'});
 assert.deepEqual(await grid.locator('tbody').evaluateAll(groups=>groups.map(group=>[group.querySelector('.qc-fixed-chain').textContent,[...group.querySelectorAll('.qc-fixed-person')].map(cell=>cell.textContent)])),[
  ['清洁',['魏涛','窦辉身']],['厨电 / 个护&健康',['王明洋']],['环境',['程相杰','张茗淳']]
 ]);
 await page.setViewportSize({width:1440,height:720});
 const sticky=await grid.evaluate(async host=>{
  const measure=()=>Object.fromEntries(['thead .qc-fixed-person','thead .qc-fixed-chain','tbody .qc-fixed-person','tbody .qc-fixed-chain','thead tr:nth-child(2) th'].map(selector=>
   [selector,host.querySelector(selector).getBoundingClientRect().left]));
  const before=measure();host.scrollLeft=500;host.scrollTop=140;
  await new Promise(requestAnimationFrame);
  return {before,after:measure(),x:host.scrollLeft,y:host.scrollTop,height:host.clientHeight,contentHeight:host.scrollHeight};
 });
 assert(sticky.x>0&&sticky.y===0&&sticky.height===sticky.contentHeight,'指标表应展示全部行，容器只可横向滚动');
 for(const selector of ['thead .qc-fixed-person','thead .qc-fixed-chain','tbody .qc-fixed-person','tbody .qc-fixed-chain'])
  assert(Math.abs(sticky.before[selector]-sticky.after[selector])<=1,selector+' 应保持固定');
 assert(sticky.before['thead tr:nth-child(2) th']-sticky.after['thead tr:nth-child(2) th']>250,'其余指标随表格横向滚动');
 await grid.evaluate(host=>{
  const toolbar=host.closest('.qc-workspace').querySelector('.qc-navigation-toolbar');
  const title=host.closest('.section').querySelector('.sectionhead');
  const titleBottom=toolbar.getBoundingClientRect().height+parseFloat(getComputedStyle(toolbar).top)+title.getBoundingClientRect().height;
  window.scrollBy({top:host.getBoundingClientRect().top-titleBottom+80,behavior:'instant'});
 });
 await page.waitForFunction(()=>{
  const host=document.querySelector('#qc-metric-pqm .qc-metrics-scroll');
  const title=host.closest('.section').querySelector('.sectionhead').getBoundingClientRect();
  const header=host.querySelector('thead').getBoundingClientRect();
  return header.top-host.getBoundingClientRect().top>50&&Math.abs(header.top-title.bottom)<=2;
 });
 await page.setViewportSize({width:1920,height:1080});
 for(const [tab,name,column] of [
  ['PQE 质改工程师','王志振','销量 Top 30 老品月退货率达标率'],['实验室工程师','刘炜','工厂 ORT'],
  ['SQE 供应商质量工程师','裴龙飞','物料供应商'],['体系工程师','冯一丹','月度全流程']
 ]){
  await metrics.getByRole('tab',{name:tab,exact:true}).click();
  assert(await metrics.getByRole('rowheader',{name,exact:true}).isVisible());
  const visible=metrics.getByRole('tabpanel',{name:tab,exact:true});
  const headers=await visible.getByRole('columnheader').allTextContents();
  assert(headers.includes(column),`${tab} 应显示「${column}」，实际列名：${headers.join('、')}`);
 }

 for(const selector of ['#new .nsp-layout','#projects .pp-layout','#matrix .matrixlayout'])assert(await director.locator(selector).isVisible());
 const analysis=director.locator('#pp-ai');
 const departmentTabs=analysis.getByRole('tablist',{name:'风险分析部门'});
 assert.deepEqual(await departmentTabs.getByRole('tab').allTextContents(),['品质中心']);
 assert(await departmentTabs.getByRole('tab',{name:'品质中心',selected:true}).isVisible());
 await analysis.getByRole('button',{name:/查看全部风险台账/}).click();
 const scopedAnalysis=await page.evaluate(()=>{
  const {facts,records}=projectAnalysisAudit();
  return {departments:records.map(({risk})=>risk.department),share:facts.riskShare};
 });
 assert(scopedAnalysis.departments.length>0);
 assert(scopedAnalysis.departments.every(departments=>departments.length===1&&departments[0]==='品质中心'));
 assert.equal(scopedAnalysis.share.count,scopedAnalysis.share.total,'红灯风险占比使用品质中心的可见台账范围');
 const life=director.locator('#lifecycle');
 await life.getByRole('button',{name:'展开品牌',exact:true}).click();
 assert(await life.locator('[data-pc-life-brand-row]').count()>0);
 const firstBrand=life.locator('[data-pc-life-brand-row] [data-life-completed]').first();
 await firstBrand.click();assert(await page.locator('#dialog').isVisible());
 assert((await page.locator('#qc-life-results th').allTextContents()).includes('品牌'));
 await page.locator('#close').click();
 const savings=director.locator('#cost');
 await savings.locator('[data-cc-view="department"]').click();
 assert.deepEqual(await savings.locator('#costtable [data-cc-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.ccRow)),['quality']);
 await savings.locator('[data-cc-department="quality"]').click();
 assert.equal(await page.locator('#dialogbody .cc-drawer').getAttribute('data-cc-group'),'quality');
 assert.deepEqual(await page.locator('#drawer-tabs [role="tab"]').allTextContents(),['品质中心']);
 await page.locator('#close').click();

 const cost=director.locator('#qc-cost-benefit');
 await nav.getByRole('link',{name:'成本收益',exact:true}).click();
 assert(await cost.getByRole('heading',{name:'品质整改项目成本收益台账'}).isVisible());
 assert.equal(await cost.locator('[data-qc-cost-metric]').count(),5);
 const header=cost.locator('.sectionhead');
 const typeTabs=header.getByRole('tablist',{name:'整改项目类型'});
 const date=header.getByLabel('整改台账统计日期');
 const categoryTabs=cost.getByRole('group',{name:'整改台账类目'});
 assert(await cost.evaluate(section=>{
  const [types,time,categories]=['.qc-cost-type-tabs','.qc-cost-time','.qc-cost-category-tabs'].map(selector=>section.querySelector(selector).getBoundingClientRect());
  return types.right<time.left&&categories.top>types.bottom&&categories.left<types.left;
 }));
 await typeTabs.getByRole('tab',{name:'新品整改',selected:true}).press('ArrowRight');
 assert(await typeTabs.getByRole('tab',{name:'老品整改',selected:true}).isVisible());
 await categoryTabs.getByRole('button',{name:'清洁',exact:true}).click();
 assert(await categoryTabs.getByRole('button',{name:'清洁',pressed:true}).isVisible());
 assert((await cost.locator('.qc-cost-table td:first-child small').allTextContents()).every(category=>category==='清洁'));
 await cost.getByRole('button',{name:/查看整改成功明细/}).click();
 assert(await cost.getByRole('heading',{name:/整改成功明细/}).isVisible());
 assert.equal(await cost.getByRole('columnheader',{name:'操作',exact:true}).count(),0);
 const costHeader=cost.getByRole('columnheader',{name:/单台\s*\/\s*总整改成本.*元/});
 assert(await costHeader.evaluate(node=>{
  const label=document.createRange();label.selectNodeContents(node.firstChild);
  const {paddingLeft,paddingRight,whiteSpace}=getComputedStyle(node);
  return whiteSpace==='nowrap'&&label.getBoundingClientRect().width<=node.clientWidth-parseFloat(paddingLeft)-parseFloat(paddingRight);
 }));
 await cost.locator('.qc-cost-table td:first-child [data-qc-cost-project]').first().click();
 const detail=page.locator('#dialogbody .qc-cost-detail');
 for(const text of ['预期退货率下降值','预期收益','测试投入','实际收益','整改盈亏','退货率趋势'])assert(await detail.getByText(text,{exact:true}).isVisible());
 await page.locator('#close').click();
 await cost.getByRole('button',{name:'季度',exact:true}).click();
 await date.fill('2026-10-23');await date.dispatchEvent('change');
 assert.equal(await date.inputValue(),'2026-10-23');
 await page.setViewportSize({width:390,height:900});
 assert(await home.evaluate(node=>node.getBoundingClientRect().right<=391));
 assert(await fullscreen.evaluate(button=>button.getBoundingClientRect().right<=391));
 assert(await cost.locator('.qc-cost-charts').evaluate(node=>node.getBoundingClientRect().right<=391));
 assert(await date.evaluate(node=>node.getBoundingClientRect().right<=391));
 await page.setViewportSize({width:1920,height:1080});
}
