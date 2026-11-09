import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {clickDiagnosisStatus} from './diagnosis-filter-helpers.mjs';

const categories=['个护类','环境类','清洁类','厨电类','健康类'];
function verifyCategoryAssociations(){
 const box=vm.createContext({pfCategories:categories,pfCategory:r=>r.category||null,
  upSpus:new Map([['a',{category:'个护类'}],['b',{category:'清洁类'}]]),sampleProjectSource:[{id:'p',category:'环境类'}]});
 vm.runInContext(readFileSync(new URL('../../src/modules/shared-classification/02-diagnosis-catalog.js',import.meta.url),'utf8'),box);
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/02-category-filter.js',import.meta.url),'utf8'),box);
 const index=box.gdCategoryIndex([{id:'suppliers',rows:[{project:{id:'s',category:'厨电类'}}]}]);
 const resolve=row=>Array.from(box.gdRowCategories(row,index));
 assert.deepEqual(resolve({object:{key:'project|p'}}),['环境类']);
 assert.deepEqual(resolve({objectKey:'product|a'}),['个护类'],'聚焦记录沿稳定对象标识关联');
 assert.deepEqual(resolve({object:{key:'admission|s'}}),['厨电类']);
 assert.deepEqual(resolve({businessObjects:[{type:'product',id:'a'},{type:'product',id:'b'},{type:'product',id:'a'}]}),['个护类','清洁类'],'跨类目任务保留所有关联，重复对象不重复计数');
 assert.deepEqual(resolve({object:{spuId:'a'},category:'健康类'}),['个护类'],'明确主数据优先于旧行类目');
 assert.deepEqual(resolve({title:'个护类产品a',objectName:'产品a'}),[],'未关联记录不按标题猜类目');
 assert.deepEqual(resolve({object:{type:'business',key:'business|archive'},sources:[{objectKey:'product|b'}]}),[],'其他来源对象不代替当前业务对象');
 const original={spuId:'a'};box.gdCategorizeRows([original],index);assert.equal(original.categories,undefined,'关联只生成视图，不改原记录');
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-analysis-model.js',import.meta.url),'utf8'),box);
 const rows=[{objectKey:'product|a',owner:'甲',department:'产品中心',topic:'测试',date:'2026-10-23',categories:['个护类']},{objectKey:'product|a',owner:'乙',department:'研发中心',topic:'测试',date:'2026-10-23',categories:['个护类']}];
 assert.deepEqual(Array.from(box.gdFocusGroups(rows.filter(r=>r.department==='研发中心'))[0].categories),['个护类'],'部门筛选重组聚焦名单后保留类目');
}
export async function diagnosisCategories(page){
 verifyCategoryAssociations();
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="coordination"]').click();
 const initial=await audit(),otherPage=await page.locator('#projects').innerText();
 const tabs={coordination:['core','omission','blocker','solution'],resource:['focus','deviation'],closure:['all']};
 const rawRows=(part,tab)=>part==='coordination'?initial.work.filter(r=>r.kind===tab):part==='closure'?initial.tasks:tab==='focus'?initial.focus:initial.mismatch.filter(r=>r.resourceType===tab);
 const eligible=rows=>rows.filter(r=>!r.task||['pending','working'].includes(r.task.status));
 for(const [part,items] of Object.entries(tabs)){
  await root.locator('[data-gd-part="'+part+'"]').click();
  for(const tab of items){
   await root.locator('[data-gd-tab="'+tab+'"]').click();
   assert.deepEqual(await root.locator('[data-gd-category]').evaluateAll(es=>es.map(e=>e.dataset.gdCategory)),['all',...categories]);
   const base=part==='closure'?rawRows(part,tab):eligible(rawRows(part,tab));
   for(const category of ['all',...categories]){
    await root.locator('[data-gd-category="'+category+'"]').click();
    const expected=base.filter(r=>category==='all'||r.categories.includes(category)),current=await audit();
    assert.deepEqual(current.visible.map(r=>r.id).sort(),expected.map(r=>r.id).sort(),part+'/'+tab+'/'+category);
    assert.equal(Number(await root.locator('[data-gd-tab="'+tab+'"]>span').innerText()),expected.length);
    assert.equal(await root.locator('[data-gd-category="'+category+'"]').getAttribute('aria-pressed'),'true');
    assert.equal(await root.locator('[data-gd-category="all"] .gd-filter-count').count(),0,'全部选项不重复展示总数');
    for(const value of categories)assert.equal(Number(await root.locator('[data-gd-category="'+value+'"] .gd-filter-count').innerText()),base.filter(r=>r.categories.includes(value)).length,'具体类目角标按其他条件下全量记录计数');
    if(!expected.length)assert(await root.locator('.gd-empty').isVisible());
    assert.equal(current.state.pages[part+'|'+tab],1,'切类目重置分页');
   }
   await root.locator('[data-gd-category="all"]').click();
  }
 }
 // 联合部门、优先级、状态、搜索；角标不只统计当前页。
 await root.locator('[data-gd-part="closure"]').click();
 const example=eligible(initial.tasks).find(r=>r.categories.length),category=example.categories[0],department=example.participants[0].department;
 await root.locator('[data-gd-category="'+category+'"]').click();await root.locator('[data-gd-department="'+department+'"]').click();
 assert((await audit()).visible.every(r=>r.categories.includes(category)&&r.participants.some(p=>p.department===department)));
 await root.locator('[data-gd-priority="P1"]').click();assert((await audit()).visible.every(r=>r.task.priority==='P1'));
 await root.locator('[data-gd-search]').fill('类目联合筛选不存在的文本');assert.equal((await audit()).visible.length,0);assert.equal(await root.locator('[data-gd-category="all"] .gd-filter-count').count(),0);
 await root.locator('[data-gd-search]').fill('');await root.locator('[data-gd-priority="all"]').click();await root.locator('[data-gd-department="all"]').click();
 await clickDiagnosisStatus(root,'all');
 assert((await audit()).visible.every(r=>r.categories.includes(category)));
 // 同模块的不同页签及三个模块各自保留选择；报告没有类目筛选且不受其影响。
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="core"]').click();await root.locator('[data-gd-category="环境类"]').click();
 await root.locator('[data-gd-tab="omission"]').click();assert.equal(await root.locator('[data-gd-category="all"]').getAttribute('aria-pressed'),'true');
 await root.locator('[data-gd-tab="core"]').click();assert.equal(await root.locator('[data-gd-category="环境类"]').getAttribute('aria-pressed'),'true');
 await root.locator('[data-gd-part="resource"]').click();assert.equal(await root.locator('[data-gd-category="all"]').getAttribute('aria-pressed'),'true');
 await root.locator('[data-gd-part="execution"]').click();
 for(const tab of ['missing','quality']){await root.locator('[data-gd-tab="'+tab+'"]').click();assert.equal(await root.locator('[data-gd-category]').count(),0);assert.equal((await audit()).visible.length,initial.reports.filter(r=>tab==='missing'?r.missing:!r.missing).length)}
 await root.locator('[data-gd-part="closure"]').click();assert.equal(await root.locator('[data-gd-category="'+category+'"]').getAttribute('aria-pressed'),'true');
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1000});
  assert(await root.locator('.gd-priority-filter').evaluate(e=>{
   const buttons=[...e.querySelectorAll('button')],height=buttons[0].getBoundingClientRect().height;
   return buttons.every(button=>{
    const box=button.getBoundingClientRect(),center=box.y+box.height/2;
    return Math.abs(box.height-height)<.1&&[...button.querySelectorAll('span')].every(span=>{const r=span.getBoundingClientRect();return Math.abs(r.y+r.height/2-center)<.1});
   });
  }),'优先级文字、嵌套标签及数量角标与全部同高居中 '+width);
  assert(await root.locator('.gd-category-filter').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'类目筛选不横向溢出 '+width);
  assert(await root.locator('.gd-filter-groups').evaluate(e=>{
   const groups=[...e.children].map(child=>child.getBoundingClientRect());
   return groups.every(box=>Math.abs(box.y-groups[0].y)<1)&&getComputedStyle(e).overflowX==='auto';
  }),'所有筛选分组保持单排，超出时在区内滚动 '+width);
  const last=root.locator('.gd-filter-groups button').last();await last.scrollIntoViewIfNeeded();
  assert(await last.evaluate(e=>{const r=e.getBoundingClientRect(),host=e.closest('.gd-filter-groups').getBoundingClientRect();return r.left>=host.left-1&&r.right<=host.right+1}),'末项可横向滚动到可视区 '+width);
  await root.locator('.gd-filter-groups').evaluate(e=>e.scrollLeft=0);
  if(width===1920||width===390)await root.locator('.gd-panel').screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-categories-'+width+'.png',import.meta.url))});
 }
 await page.setViewportSize({width:1920,height:1080});assert.equal(await page.locator('#projects').innerText(),otherPage,'不改其他模块筛选');
 console.log('通过：三模块七页签类目、主数据关联、跨类目/未关联、角标与联合筛选、空态/分页/记忆、报告排除及桌面窄屏');
}
