import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function projectDates(page){
 // 原始值排序的边界：缺失置后、跨年日期、相同值稳定；格式化不影响计算。
 const source=fs.readFileSync(new URL('../../src/modules/project-panorama/01-model.js',import.meta.url),'utf8');
 const ctx=vm.createContext({});vm.runInContext(source,ctx);
 for(const [light,actual,delay,expected,high] of [
  ['绿灯',null,1,'红灯',false],['绿灯',null,15,'红灯',false],['绿灯',null,16,'红灯',true],['黄灯',null,51,'红灯',true],
  ['黄灯',null,0,'黄灯',false],['绿灯',null,0,'绿灯',false],['绿灯',null,null,'绿灯',false],['绿灯','2026-10-01',20,'绿灯',false]
 ]){const status=ctx.ppProjectLight({status:light},actual,delay);assert.equal(status,expected);assert.equal(vm.runInContext(`ppHighRisk(${JSON.stringify({status,delay})})`,ctx),high);}

 const records=[{id:3,plan:null},{id:2,plan:'2027-01-01'},{id:1,plan:'2026-12-31'},{id:4,plan:'2026-12-31'}];
 for(const [direction,expected] of [['asc',[1,4,2,3]],['desc',[2,1,4,3]]])assert.deepEqual(records.slice().sort((a,b)=>ctx.ppCompareProjects(a,b,{key:'plan',direction})).map(r=>r.id),expected);
 const mixed=[
  {id:1,plan:'2026-12-31',revisedPlan:'2027-01-02'},
  {id:2,plan:'2027-01-01'},
  {id:3,plan:'2027-01-04',revisedPlan:'2026-01-01'},
  {id:4,plan:null,revisedPlan:'2027-01-03'},
  {id:5,plan:'2026-12-31'},
  {id:6,plan:null,revisedPlan:null},
  {id:7,plan:'2027-01-02',revisedPlan:'2027-01-02'},
  {id:8,plan:'—',revisedPlan:null}
 ];
 for(const [direction,expected] of [['asc',[5,2,1,7,4,3,6,8]],['desc',[3,4,1,7,2,5,6,8]]])assert.deepEqual(mixed.slice().sort((a,b)=>ctx.ppCompareProjects(a,b,{key:'plan',direction})).map(r=>r.id),expected);
 await page.locator('a[href="#projects"]').click();
 const snapshot=()=>page.evaluate(()=>window.projectPanoramaAudit());
 let audit=await snapshot();assert.deepEqual(audit.state.sort,{key:'plan',direction:'asc'});
 assert(audit.scope.some(p=>p.revisedPlan));assert(audit.scope.some(p=>!p.revisedPlan));
 const verify=async()=>{
  const data=await snapshot(),{key,direction}=data.state.sort;
  const expected=data.scope.slice().sort((a,b)=>{
   const value=p=>key==='plan'?([p.plan,p.revisedPlan].filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')).sort().at(-1)||null):p[key]??null;
   const av=value(a),bv=value(b);
   if(av===null||bv===null)return av===bv?a.id-b.id:av===null?1:-1;
   return (typeof av==='number'?av-bv:av.localeCompare(bv))*(direction==='asc'?1:-1)||a.id-b.id;
  });
  assert.deepEqual(data.filtered.map(p=>p.id),expected.map(p=>p.id));
  assert.deepEqual(await page.locator('[data-pp-row]').evaluateAll(els=>els.map(e=>Number(e.dataset.ppRow))),expected.slice(0,10).map(p=>p.id));
  assert.deepEqual(await page.locator('[data-pp-row] .pp-plan-dates').evaluateAll(els=>els.map(e=>e.querySelectorAll('small').length)),expected.slice(0,10).map(p=>p.revisedPlan?1:0));
  assert.equal(await page.locator(`[data-pp-sort="${key}"]`).getAttribute('data-direction'),direction);
 };
 await verify();
 assert.equal(await page.locator('.pp-table th').nth(3).innerText(),'计划上线日期');
 assert.equal(await page.locator('.pp-table th').nth(3).locator('[data-pp-sort]').count(),1);
 assert.equal(await page.locator('[data-pp-sort="revisedPlan"]').count(),0);
 const first=audit.filtered[0],cell=page.locator('[data-pp-row]').first().locator('td').nth(3);
 const date=s=>s?s.slice(2).replaceAll('-','/'):'—';
 assert.deepEqual(await cell.locator('.pp-plan-dates>span,.pp-plan-dates>small').allTextContents(),[date(first.plan),...(first.revisedPlan?['延期 '+date(first.revisedPlan)]:[])]);
 for(const key of ['plan','actual','delay','started']){
  for(let i=0;i<2;i++){await page.locator(`[data-pp-sort="${key}"]`).click();await verify();}
 }
 await page.locator('[data-pp-page="2"]').first().click();
 await page.locator('[data-pp-sort="plan"]').click();assert.equal((await snapshot()).state.page,1);
 await page.locator('[data-pp-reset]').click();assert.deepEqual((await snapshot()).state.sort,{key:'plan',direction:'asc'});
 // 动态文本、标题和原生日期输入分离：展示统一，业务字段原值不变。
 await page.evaluate(()=>{const el=document.createElement('div');el.id='date-display-check';el.innerHTML='<span title="截至2026-10-10">2026-10-10 — 2027/1/2，2024年2月29日</span><input type="date" value="2026-10-10"><span data-date-raw>2026-10-10</span>';document.body.append(el)});
 assert.equal(await page.locator('#date-display-check>span').first().innerText(),'26/10/10 — 27/01/02，24/02/29');
 assert.equal(await page.locator('#date-display-check>span').first().getAttribute('title'),'截至26/10/10');
 assert.equal(await page.locator('#date-display-check input').inputValue(),'2026-10-10');
 assert.equal(await page.locator('#date-display-check [data-date-raw]').innerText(),'2026-10-10');
 await page.locator('#date-display-check>span').first().evaluate(e=>e.firstChild.nodeValue='2026-12-31');
 assert.equal(await page.locator('#date-display-check>span').first().innerText(),'26/12/31');
 await page.locator('#date-display-check').evaluate(e=>e.remove());
 for(const link of ['#risk','#new','#sales','#projects']){
  await page.locator(`a[href="${link}"]`).click();
  const remaining=await page.locator(link).evaluate(root=>{const out=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest('input,textarea,script,style,[contenteditable="true"]')&&/\b20\d{2}-\d{2}-\d{2}\b/.test(n.nodeValue))out.push(n.nodeValue)}return out});
  assert.deepEqual(remaining,[],link+'未格式化的展示日期');
 }
}
