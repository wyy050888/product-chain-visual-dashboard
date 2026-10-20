import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function sortRules(){
 const ctx=vm.createContext({window:{}}),source=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 vm.runInContext(source('risk-presentation/03-sort.js'),ctx);vm.runInContext(source('cost-control/01-model.js'),ctx);
 const values=[['A',100,0,-100,0],['B',-10,null,null,null],['C',100,25,-75,25],['D',null,10,null,null],['E',200,25,-175,12.5],['F',null,NaN,null,null]];
 const rows=values.map(([id,target,actual,gap,rate])=>({id,values:{month:{target,actual,gap,rate}}}));
 const result=(key,direction)=>Array.from(ctx.ccSortedDepartmentRows(rows,{key:'month-'+key,direction}),row=>row.id);
 assert.deepEqual(result('actual','desc'),['C','E','D','A','B','F']);assert.deepEqual(result('actual','asc'),['A','D','C','E','B','F'],'0参与数值排序；空值两种方向均置后');
 assert.deepEqual(result('target','asc'),['B','A','C','E','D','F'],'目标按分值排序，支持负值和同额稳定顺序');
 assert.deepEqual(result('gap','asc'),['E','A','C','B','D','F']);assert.deepEqual(result('rate','desc'),['C','E','A','B','D','F']);
 assert.equal(ctx.ccSortedDepartmentRows(rows,{key:'',direction:''}),rows,'取消排序恢复原始部门顺序');
}
export async function verifyCostHeaderSort(page){
 sortRules();
 const root=page.locator('#cost'),host=root.locator('#costtable'),period=root.locator('[data-time-scope="cost"]'),audit=()=>page.evaluate(()=>window.costControlAudit()),ids=()=>host.locator('tbody tr').evaluateAll(nodes=>nodes.map(node=>node.dataset.ccRow));
 const original=await ids(),cardText=await root.locator('#costcards').innerText();
 assert.equal(await host.locator('[data-cc-sort]').count(),12,'九个数值表头，目标和实际各有独立入口');
 const verify=async(key,direction)=>{
  const [mode,measure]=key.split('-'),rows=(await audit()).rows,values=new Map(rows.map(row=>[row.id,row.values[mode][measure]])),ordered=await ids(),sourceIndex=new Map(rows.map((row,index)=>[row.id,index]));
  assert.deepEqual([...ordered].sort(),[...original].sort());
  let missing=false,previous=null,previousId=null;
  for(const id of ordered){const value=values.get(id);if(!Number.isFinite(value)){missing=true;continue}assert(!missing,'缺失值不能穿插在数值前');if(previous!==null){assert(direction==='asc'?previous<=value:previous>=value,'按未格式化原值排序 '+key);if(previous===value)assert(sourceIndex.get(previousId)<sourceIndex.get(id),'同值保留原部门顺序')}previous=value;previousId=id}
 };
 for(const mode of ['month','quarter','year'])for(const metric of ['target','actual','rate','gap']){
  const key=mode+'-'+metric,button=()=>host.locator(`[data-cc-sort="${key}"]`);
  for(const direction of ['desc','asc','']){
   await button().click();assert.equal(await button().getAttribute('data-direction'),direction);
   assert.equal(await button().evaluate(n=>n.closest('th').getAttribute('aria-sort')),direction==='desc'?'descending':direction==='asc'?'ascending':'none');
   if(direction)await verify(key,direction);else assert.deepEqual(await ids(),original);
  }
 }
 assert.equal(await root.locator('#costcards').innerText(),cardText,'只排序表格，不影响卡片金额');
 const actual=()=>host.locator('[data-cc-sort="month-actual"]');await actual().focus();await page.keyboard.press('Enter');await verify('month-actual','desc');await page.keyboard.press('Space');await verify('month-actual','asc');await actual().click();
 await host.locator('[data-cc-sort="year-actual"]').click();await period.locator('[data-time-value]').selectOption('9');await verify('year-actual','desc');
 await period.locator('[data-time-mode="quarter"]').click();assert.equal(await host.locator('[data-cc-sort]').count(),8);await verify('year-actual','desc');
 await period.locator('[data-time-mode="year"]').click();assert.equal(await host.locator('[data-cc-sort]').count(),4);await period.locator('[data-time-year]').selectOption('2025');await verify('year-actual','desc');
 await period.locator('[data-time-year]').selectOption('2026');await period.locator('[data-time-mode="month"]').click();await period.locator('[data-time-value]').selectOption('10');
 await host.locator('[data-cc-sort="month-target"]').click();await period.locator('[data-time-mode="year"]').click();assert.equal(await host.locator('[data-cc-sort][data-direction]:not([data-direction=""])').count(),0,'隐藏月份列时清除对应排序');
 await period.locator('[data-time-mode="month"]').click();await period.locator('[data-time-value]').selectOption('10');assert.deepEqual(await ids(),original);
 await host.locator('[data-cc-sort="year-rate"]').click();const first=host.locator('tbody tr').first(),id=await first.getAttribute('data-cc-row');await first.locator('[data-cc-department]').click();assert.equal(await page.locator('.cc-drawer').getAttribute('data-cc-department'),id,'排序后查看仍对应正确部门');await page.locator('#close').click();
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1080});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'排序表头不撑宽页面 '+width);
  assert(await host.locator('th').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),'复合表头内容限制在列内 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});await host.locator('thead').screenshot({path:fileURLToPath(new URL('../../outputs/cost-sort-header.png',import.meta.url))});
 await host.locator('[data-cc-sort="year-rate"]').click();await host.locator('[data-cc-sort="year-rate"]').click();assert.deepEqual(await ids(),original);
 console.log('通过：降本12项原值三态排序、空值与0/负数、同值稳定、期间切换、键盘与查看部门');
}
