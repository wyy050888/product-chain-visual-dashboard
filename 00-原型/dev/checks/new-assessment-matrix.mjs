import {openNewProductSpu} from './new-products-detail.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function assessmentMatrixModel(){
 const calls=[],product=(spuId,chain,success)=>({spuId,chain,successAssessment:{included:true,success,carried:false}});
 const box=vm.createContext({DATA_CUTOFF:'2026-05-15',boundedCache:()=>new Map(),nspMatchesProduct:(product,text)=>[product.name,product.model,product.spuCode].some(value=>String(value??'').toLocaleLowerCase().includes(text)),chains:['清洁','厨电','环境','个护&健康'],
  filterCatalog:{chains:['环境','清洁','厨电','个护&健康'],normalizeChain:value=>['清洁','厨电','环境','个护&健康'].includes(value)?value:null},iso:date=>date.toISOString().slice(0,10),
  nspAssessmentData:(period,cutoff)=>{calls.push({...period,cutoff});const rows=period.mode==='year'?[product('a',0,false),product('b',2,false),product('c',1,true)]:period.value===1?[product('a',0,false),product('b',2,true)]:[product('a',0,true),product('c',1,false)];return {period,assessment:{annual:period.mode==='year'},rows}}});
 for(const file of ['00-success-approvals.js','01-success.js','03-assessment-matrix-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/new-products/'+file,import.meta.url),'utf8'),box);
 const matrix=box.nspAssessmentMatrix(2026,false,null,{});
 assert.equal(calls.length,2,'未来季度不查询、不生成0值');assert.equal(matrix.periods[2].data,null);assert.equal(matrix.periods[3].data,null);assert.equal(matrix.periods[1].ongoing,true);
 for(const period of matrix.periods.filter(p=>p.available))assert.equal(period.data.rows.length,2);
 const company=matrix.groups[0];assert.equal(company.summaries[0].total,2);assert.equal(company.summaries[1].success,1);assert.equal(company.summaries[2],null);
 const chain=matrix.groups.find(g=>g.key==='清洁');assert.equal(chain.summaries[0].success,0);assert.equal(chain.summaries[1].success,1);
 const annual=box.nspAssessmentMatrix(2026,true,null,{});assert.equal(annual.periods.length,1);assert.equal(annual.groups[0].summaries[0].total,3);assert.equal(annual.groups[0].summaries[0].success,1,'年度独立复核，不累加季度成功数');
 assert.equal(box.nspAssessmentScopedData(matrix.periods[1].data,'厨电').rows[0].spuId,'c');assert.equal(box.nspAssessmentScopedData(matrix.periods[1].data,'环境').summary.total,0);
 const searchable={assessment:{annual:false},rows:[{...product('a',0,true),name:'创维取暖器',spuCode:'CW-A944',model:'A944'},{...product('b',1,false),name:'康佳风扇',spuCode:'KJ-Q513',model:'Q513'},product('missing',2,false)]};
 const searchIds=text=>Array.from(box.nspAssessmentSearchData(searchable,text).rows,p=>p.spuId);
 assert.deepEqual(searchIds('取暖器'),['a']);assert.deepEqual(searchIds(' cw-a944 '),['a']);assert.deepEqual(searchIds('q513'),['b']);assert.deepEqual(searchIds('不存在'),[]);
 assert.equal(box.nspAssessmentSearchData(searchable,'  '),searchable);assert.equal(box.nspAssessmentSearchData(searchable,'A944').summary.success,1);assert.equal(searchable.rows.length,3,'搜索不修改原名单');
 const independent=[{...product('research',0,false),developmentType:'自研',projectType:'自选'},{...product('selected',2,true),developmentType:'自选'},{...product('missing',1,false)}];
 Object.assign(box,{nspFilters:{},drawerWithPeriod:(_period,fn)=>fn(),bounds:()=>({start:'2026-04-01',cutoff:'2026-05-15'}),nspSuccessPeriod:()=>({start:'2026-04-01',annual:false}),nspCategoryRows:()=>independent,nspFilterRows:(rows,filters)=>rows.filter(row=>filters.developmentType==='all'||(row.developmentType||'-')===filters.developmentType)});
 const query=fs.readFileSync(new URL('../../src/modules/new-products/03-assessment-query.js',import.meta.url),'utf8');vm.runInContext(query.slice(0,query.indexOf('let nspAssessmentCurrent')),box);
 assert.deepEqual(Array.from(box.nspAssessmentData({},null,{developmentType:'自研'}).rows,p=>p.spuId),['research'],'独立SPU属性优先，不按项目类型推断');
 assert.deepEqual(Array.from(box.nspAssessmentData({},null,{developmentType:'自选'}).rows,p=>p.spuId),['selected']);
 assert.equal(box.nspAssessmentData({},null,{developmentType:'all'}).rows.length,3,'缺失类型留在全部，不擅自归类');
 console.log('通过：四季边界、未来季度、链群汇总/筛选及年度独立结果');
}
export async function newAssessmentMatrix(page){
 assessmentMatrixModel();
 const reload=async date=>{await page.clock.setFixedTime(new Date(date+'T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready')};
 const audit=()=>page.evaluate(()=>{const data=dashboardNewProductAssessmentSnapshot();return {period:data.period,result:data.result,chain:data.chain,page:data.page,query:data.query,developmentType:data.developmentType,summary:data.summary,matrix:data.matrix,rows:data.rows.map(p=>({spuId:p.spuId,name:p.name,spuCode:p.spuCode,model:p.model,chain:p.chain,developmentType:p.developmentType,success:p.successAssessment.success}))}});
 const cell=(quarter,chain='all',pool='all')=>page.locator('[data-nsp-assess-matrix="'+quarter+'"][data-nsp-assess-chain="'+chain+'"][data-nsp-assess-pool="'+pool+'"]').first();
 await reload('2026-10-27');
 const outer=await page.evaluate(()=>({period:dashboardNewProductsSnapshot().period,filters:dashboardNewProductsSnapshot().filters}));
 await page.locator('#newtop [data-nsp-assessment-entry]').click();let data=await audit();
 assert.equal(await page.locator('[data-nsp-assess-quarter],.nsp-assessment-notice').count(),0,'移除季度下拉与说明条');assert(await page.locator('#drawer-tabs').isHidden(),'结果筛选移到明细旁');
 assert.deepEqual(await page.locator('.nsp-quarter-group').allTextContents(),['Q1','Q2','Q3','Q4']);assert.equal(data.period.value,4);
 assert.equal(await page.locator('.nsp-assessment-matrix thead button,.nsp-assessment-matrix thead a').count(),0,'季度标题仅展示，数字保留交互');
 await page.locator('.nsp-quarter-group').nth(2).click();assert.equal((await audit()).period.value,4,'点击季度标题不切换明细');
 const divider=()=>page.locator('.nsp-assessment-matrix thead th').first().evaluate(cell=>{const css=getComputedStyle(cell);return {width:css.borderRightWidth,style:css.borderRightStyle,height:cell.getBoundingClientRect().height,head:cell.closest('thead').getBoundingClientRect().height}});
 let border=await divider();assert.equal(border.width,'1px');assert.equal(border.style,'solid');assert(Math.abs(border.height-border.head)<1,'产品链表头框线贯穿两行');
 assert.equal(await page.locator('.nsp-assessment-matrix tbody tr').count(),5);
 assert.equal(await page.locator('#dialog .dialoghead [data-nsp-assess-year],#dialog .dialoghead [data-nsp-assess-kind]').count(),0,'时间控件移出标题栏');
 assert.deepEqual(await page.locator('[data-nsp-assess-development]').allTextContents(),['全部','自研','自选','-']);
 assert(await page.locator('[data-nsp-assessment-controls]').evaluate(el=>{const box=el.getBoundingClientRect(),matrix=el.nextElementSibling.getBoundingClientRect();return box.bottom<matrix.top&&Math.abs(box.left-matrix.left)<1}),'筛选统一在矩阵上方且左侧对齐');
 for(let q=0;q<4;q++)for(const field of ['total','success'])assert.equal(data.matrix.groups[0].summaries[q][field],data.matrix.groups.slice(1).reduce((sum,g)=>sum+g.summaries[q][field],0),'公司与链群合计守恒 '+q+' '+field);
 const originalMatrix=data.matrix,group=data.matrix.groups.slice(1).find(g=>g.summaries[3].success>0);
 const search=page.locator('[data-nsp-assess-search]'),searchNode=await search.elementHandle(),searchProduct=data.rows.find(p=>p.success&&p.spuCode),keyword=searchProduct.spuCode.toLowerCase();
 if(data.summary.total>10)await page.locator('[data-nsp-assess-page="2"]').first().click();
 await search.fill(' '+keyword+' ');data=await audit();assert.equal(data.page,1);assert.equal(data.summary.total,1);assert.equal(data.rows[0].spuId,searchProduct.spuId);assert.deepEqual(data.matrix,originalMatrix,'搜索只筛选下方明细');
 assert(await searchNode.evaluate(node=>node.isConnected&&document.activeElement===node),'输入保留原节点与焦点');
 assert.deepEqual(await page.locator('[data-nsp-assess-result]').allTextContents(),['全部纳入 1','成功 1','不成功 0']);
 await page.locator('[data-nsp-assess-result="failure"]').click();assert.equal(await page.locator('[data-nsp-assessment-table] [data-nsp-assess-product]').count(),0,'关键词与结果取交集');
 await page.locator('[data-nsp-assess-result="all"]').click();
 await openNewProductSpu(page.locator('[data-nsp-assess-product]').first());await page.locator('.up-detail').waitFor();await page.locator('#close').click();assert.equal((await audit()).query,' '+keyword+' ','详情返回保留关键词');
 await page.locator('[data-nsp-assess-kind="year"]').click();assert.equal((await audit()).query,' '+keyword+' ');await page.locator('[data-nsp-assess-kind="quarter"]').click();
 await page.locator('[data-nsp-assess-development="'+searchProduct.developmentType+'"]').click();assert.equal((await audit()).summary.total,1);assert.equal(await search.inputValue(),' '+keyword+' ');await page.locator('[data-nsp-assess-development="all"]').click();
 await search.fill('不存在的考核产品');assert.equal((await audit()).summary.total,0);assert.equal(await page.locator('[data-nsp-assessment-table] .empty').textContent(),'暂无匹配产品');
 await search.fill('');data=await audit();assert.equal(data.summary.total,originalMatrix.periods[3].summary.total);assert.deepEqual(data.matrix,originalMatrix);await searchNode.dispose();
 if(data.summary.total>10){await page.locator('[data-nsp-assess-page="2"]').first().click();assert.equal((await audit()).page,2)}
 for(const developmentType of ['自研','自选','-']){
  await page.locator('[data-nsp-assess-development="'+developmentType+'"]').click();data=await audit();assert.equal(data.developmentType,developmentType);assert.equal(data.page,1,'切换开发类型重置明细分页');
  for(let q=0;q<4;q++){
   const expected=originalMatrix.periods[q].members.filter(member=>member.developmentType===developmentType);
   assert.deepEqual(data.matrix.periods[q].members.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort(),'自研/自选同时筛选四季矩阵');
   assert.equal(data.matrix.groups[0].summaries[q].total,expected.length);assert.equal(data.matrix.groups[0].summaries[q].success,expected.filter(p=>p.success).length);
  }
  assert(data.rows.length>0&&data.rows.every(p=>p.developmentType===developmentType),'下方明细同范围');
  await openNewProductSpu(page.locator('[data-nsp-assess-product]').first());await page.locator('.up-detail').waitFor();await page.locator('#close').click();assert.equal((await audit()).developmentType,developmentType,'详情返回保留开发类型');
  assert.equal(await page.locator('[data-nsp-assess-development="'+developmentType+'"]').getAttribute('aria-pressed'),'true');
 }
 await page.locator('[data-nsp-assess-development="all"]').click();data=await audit();assert.deepEqual(data.matrix,originalMatrix,'恢复全部不改变原始考核结果');
 await cell(4,group.key,'success').click();data=await audit();assert.equal(data.chain,group.key);assert.equal(data.result,'success');assert.equal(data.summary.success,group.summaries[3].success);
 assert.equal(await page.locator('[data-nsp-assessment-table] [data-nsp-assess-product]').count(),Math.min(10,data.summary.success));assert.deepEqual(data.matrix,originalMatrix,'点击数字不改变矩阵总体口径');
 await page.locator('[data-nsp-assess-result="all"]').click();assert.equal((await audit()).result,'all');await page.locator('[data-nsp-assess-result="success"]').focus();await page.keyboard.press('ArrowRight');assert.equal((await audit()).result,'failure');
 await cell(3).click();data=await audit();assert.equal(data.period.value,3);assert.equal(data.chain,'all');assert.equal(data.summary.total,originalMatrix.periods[2].summary.total);
 await openNewProductSpu(page.locator('[data-nsp-assess-product]').first());await page.locator('.up-detail').waitFor();await page.locator('#close').click();assert.equal((await audit()).period.value,3,'详情返回保留季度');
 await cell(4).click();
 for(const width of [1920,1440,1024,800,390,320]){
  await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'抽屉正文不横向溢出 '+width);
  assert(await page.locator('.nsp-assessment-head-controls').evaluate(el=>{const b=el.getBoundingClientRect(),d=el.closest('#dialog').getBoundingClientRect();return b.left>=d.left&&b.right<=d.right}),'时间控件完整 '+width);
  assert(await search.evaluate(el=>{const b=el.getBoundingClientRect(),d=el.closest('#dialogbody').getBoundingClientRect();return b.width>100&&b.left>=d.left&&b.right<=d.right}),'搜索框完整 '+width);
  if(width>=1024)assert(await page.locator('.nsp-assessment-matrix-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'桌面四季一次看全 '+width);
  if(width===1920||width===390)await page.screenshot({path:'../outputs/assessment-quarter-matrix-'+width+'.png'});
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-nsp-assess-kind="year"]').click();data=await audit();assert.equal(data.matrix.periods.length,1);assert.equal(data.period.mode,'year');
 assert.equal(await page.locator('.nsp-assessment-matrix thead button').count(),0,'年度标题无交互');border=await divider();assert.equal(border.width,'1px');assert(Math.abs(border.height-border.head)<1,'年度表头框线完整');
 const pool=new Set(originalMatrix.periods.flatMap(p=>p.members.map(r=>r.spuId)));assert.deepEqual(data.rows.map(r=>r.spuId).sort(),[...pool].sort(),'年度纳入是四季名单并集');
 const annualPool=data.matrix.periods[0].members;
 for(const developmentType of ['自研','自选','-']){await page.locator('[data-nsp-assess-development="'+developmentType+'"]').click();data=await audit();assert.equal(data.period.mode,'year');assert.deepEqual(data.rows.map(p=>p.spuId).sort(),annualPool.filter(p=>p.developmentType===developmentType).map(p=>p.spuId).sort(),'年度按独立属性筛选');}
 await page.locator('[data-nsp-assess-development="all"]').click();
 await page.locator('[data-nsp-assess-kind="quarter"]').click();assert.equal((await audit()).period.value,4);
 await page.locator('[data-nsp-assess-year]').selectOption('2025');assert.equal((await audit()).period.year,2025);assert.equal(await page.locator('.nsp-quarter-group').count(),4);
 await page.locator('#close').click();const after=await page.evaluate(()=>({period:dashboardNewProductsSnapshot().period,filters:dashboardNewProductsSnapshot().filters}));assert.deepEqual(after,outer,'抽屉不回写外侧期间和筛选');
 await reload('2027-01-15');await page.locator('#newtop [data-nsp-assessment-entry]').click();data=await audit();assert.equal(data.matrix.periods.filter(p=>p.available).length,1);assert.equal(await page.locator('[data-nsp-assess-matrix="2"],[data-nsp-assess-matrix="3"],[data-nsp-assess-matrix="4"]').count(),0,'未来季度没有可点击数字');assert.equal(await page.locator('.nsp-matrix-future').count(),15);
 console.log('通过：四季同时展示、数字联动、链群与结果筛选、年度去重、跨年/未来季度、详情返回、五档布局');
}
