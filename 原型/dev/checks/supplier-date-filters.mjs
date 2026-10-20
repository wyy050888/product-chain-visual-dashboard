import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
let dayCalendarGeometry;
const calendarGeometry=panel=>panel.evaluate(node=>{
 const box=el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height}};
 return {panel:box(node),body:box(node.querySelector('.risk-calendar-body')),sidebar:box(node.querySelector('.risk-calendar-presets')),month:box(node.querySelector('.risk-calendar-month')),header:box(node.querySelector('.risk-calendar-month h3')),cell:box(node.querySelector('.risk-calendar-grid button'))};
});
export async function captureSupplierDayCalendar(page){
 await page.locator('#riskrail [data-risk="1"]').click();await page.locator('#dialogsub .risk-date-trigger').click();
 const panel=page.locator('#up-date-popover');dayCalendarGeometry=await calendarGeometry(panel);
 assert.equal(await panel.locator('[data-range-preset=year]').innerText(),'本年','日模式也有本年快捷项');
 assert.equal(await panel.locator('[data-range-preset="30"]').getAttribute('aria-pressed'),'true','日模式回显已选近30日');
 await page.keyboard.press('Escape');await page.locator('#close').click();
}
export async function verifyCalendarAlignment(page){
 assert(dayCalendarGeometry,'先获取图2日模式的实际尺寸');
 for(const key of ['registered','reserved','admitted','cooperation']){
  await supplierDateField(page,key).locator('[data-scp-date-open]').click();
  const panel=page.locator('#up-date-popover'),actual=await calendarGeometry(panel);
  assert.deepEqual(actual,dayCalendarGeometry,key+'弹层、双月网格及日期单元与日模式尺寸一致');
  assert.deepEqual((await panel.locator('[data-range-preset]').allTextContents()).slice(0,9),['今日','昨日','近7日','近15日','近30日','本周','上周','本月','上月']);
  assert(await panel.locator('.risk-calendar-presets').evaluate(node=>node.scrollHeight>node.clientHeight),'扩展快捷项在侧栏滚动');
  await page.keyboard.press('Escape');
 }
 const field=supplierDateField(page,'registered');await field.locator('[data-scp-date-open]').click();await page.locator('#up-date-popover [data-range-preset="30"]').click();
 await field.locator('[data-scp-date-open]').click();
 const panel=page.locator('#up-date-popover');assert.equal(await panel.locator('[data-range-preset="30"]').getAttribute('aria-pressed'),'true');assert.equal(await panel.locator('.range-edge:not(.outside)').count(),2);
 const day=panel.locator('[data-range-date]:not(:disabled)').first();await day.click();assert.equal(await panel.locator('[aria-pressed="true"]').count(),0,'手选范围清除快捷选中态');
 await page.keyboard.press('Escape');await page.locator('[data-scp-member-reset]').click();
 console.log('通过：注册/储备/准入/合作日历与日模式等尺寸、同快捷顺序及范围选中态');
}
export const supplierDateField=(page,key)=>page.locator(`[data-scp-date="${key}"]`);
const todayOf=page=>page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
async function calendarDate(page,date){
 const calendar=page.locator('#up-date-popover'),month=date.slice(0,7);
 for(let i=0;i<340;i++){
  const day=calendar.locator(`[data-range-date="${date}"]:not(:disabled)`);if(await day.count()){await day.click();return}
  const shown=await calendar.locator('.risk-calendar-month').first().locator('[data-range-date]:not(.outside)').first().getAttribute('data-range-date');
  const delta=(Number(month.slice(0,4))-Number(shown.slice(0,4)))*12+Number(month.slice(5,7))-Number(shown.slice(5,7));
  const steps=delta<0?delta:delta-(await calendar.locator('.risk-calendar-month:visible').count()-1);
  await calendar.evaluate((panel,steps)=>{for(let n=0;n<Math.abs(steps);n++)panel.querySelector('[data-range-month="'+(steps<0?'-1':'1')+'"]').click()},steps);
 }
 throw Error('无法选择日期：'+date);
}
export async function setSupplierDate(page,key,from='',to=''){
 const picker=supplierDateField(page,key);await picker.locator('[data-scp-date-open]').click();
 if(!from&&!to){await page.locator('#up-date-popover [data-range-clear]').click();return}
 assert(from&&to,'手动日期筛选使用完整范围');await calendarDate(page,from);await calendarDate(page,to);
}
export async function assertSupplierDateEntry(page,payload){
 const key={reserved:'reserved',admitted:'admitted',newAdmitted:'admitted',cooperated:'cooperation',newCooperation:'cooperation'}[payload.metric],today=await todayOf(page);
 const end=payload.period.future?payload.period.end:payload.period.end<today?payload.period.end:today;
 assert.equal(await page.locator('[data-scp-member-filter="metric"]').count(),0,'移除统计口径');
 for(const field of ['registered','reserved','admitted','cooperation']){
  const picker=supplierDateField(page,field),selected=field===key;
  assert.equal(await picker.locator('[data-scp-date-from]').inputValue(),selected&&(payload.metric.startsWith('new')||payload.period.future)?payload.period.start:'');
  assert.equal(await picker.locator('[data-scp-date-to]').inputValue(),selected?end:'');
 }
}
function dateDefaults(){
 const clock=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-19T08:00:00Z']))}},ctx=vm.createContext({Date:clock});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/period/01.js',import.meta.url),'utf8').split('const moduleIds=')[0],ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/supplier-planning/03-date-filters.js',import.meta.url),'utf8'),ctx);
 for(const [metric,key] of [['newAdmitted','admitted'],['newCooperation','cooperation'],['reserved','reserved'],['admitted','admitted'],['cooperated','cooperation']]){
  const range={start:'2026-01-01',end:'2026-12-31',cutoff:'2026-10-10'},date=ctx.scpMemberDateDefaults(metric,range)[key];
  assert.equal(date.to,'2026-10-19','日期筛选回填今天，不冒充数据截止日');assert.equal(date.from,metric.startsWith('new')?'2026-01-01':'','累计不能排除往年入池');
 }
 assert.equal(ctx.scpMemberDateDefaults('newCooperation',{start:'2025-01-01',end:'2025-12-31',cutoff:'2025-12-31'}).cooperation.to,'2025-12-31');
 assert.equal(ctx.scpMemberDateDefaults('newAdmitted',{start:'2026-04-01',end:'2026-06-30',cutoff:'2026-06-30'}).admitted.to,'2026-06-30');
}
export async function verifySupplierDateFilters(page,allCompanies,collect){
 dateDefaults();await verifyCalendarAlignment(page);
 const companies=allCompanies.filter(s=>!s.disabled||s.disabled>'2026-10-10');
 const reset=()=>page.locator('[data-scp-member-reset]').click(),ids=rows=>rows.map(s=>s.id).sort();
 assert.deepEqual(await page.locator('.scp-date-field .unified-field-name').allTextContents(),['注册日期','储备日期','准入日期','合作日期']);
 assert.equal(await page.locator('.scp-date-menu,.scp-date-picker,.scp-member-filters input[type=date]').count(),0,'移除自制日期弹层与双原生日期框');
 for(const key of ['registered','reserved','admitted','cooperation']){
  await reset();const date=companies.find(s=>s[key]&&s[key]<='2026-10-10')[key];
  await setSupplierDate(page,key,date,date);assert.deepEqual(await collect(page),ids(allCompanies.filter(s=>s[key]===date&&(!s.disabled||s.disabled>date))),key+'包含起止当天，空值不命中');
  await supplierDateField(page,key).locator('[data-scp-date-clear]').click();assert.deepEqual(await collect(page),ids(companies),'清空单个日期恢复全部');
 }
 await setSupplierDate(page,'registered','2024-01-01','2025-12-31');await setSupplierDate(page,'admitted','2025-01-01','2026-10-10');
 const expected=ids(companies.filter(s=>s.registered>='2024-01-01'&&s.registered<='2025-12-31'&&s.admitted&&s.admitted>='2025-01-01'&&s.admitted<='2026-10-10'));
 assert.deepEqual(await collect(page),expected,'多个日期条件按交集');
 await page.locator('#drawer-tabs [data-drawer-tab="material"]').click();assert.equal(await supplierDateField(page,'registered').locator('[data-scp-date-from]').inputValue(),'');
 await page.locator('#drawer-tabs [data-drawer-tab="machine"]').click();assert.equal(await supplierDateField(page,'registered').locator('[data-scp-date-from]').inputValue(),'2024-01-01');assert.deepEqual(await collect(page),expected);
 const picker=supplierDateField(page,'cooperation');await picker.locator('[data-scp-date-open]').click();await calendarDate(page,'2026-10-08');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#up-date-popover').count(),0);assert(await page.locator('#dialog').isVisible(),'Escape只收起日期弹层');
 assert.equal(await picker.locator('[data-scp-date-from]').inputValue(),'','未完成范围不改变条件');assert.deepEqual(await collect(page),expected);
 await picker.locator('[data-scp-date-open]').click();await page.locator('#dialogtitle').click();assert.equal(await page.locator('#up-date-popover').count(),0,'点击外部收起');
 await setSupplierDate(page,'cooperation','2026-10-08','2026-10-01');assert.equal(await picker.locator('[data-scp-date-from]').inputValue(),'2026-10-01','逆序选择自动按起止排序');assert.equal(await picker.locator('[data-scp-date-to]').inputValue(),'2026-10-08');
 await reset();for(const key of ['registered','reserved','admitted','cooperation'])assert.equal(await supplierDateField(page,key).locator('[data-scp-date-to]').inputValue(),'');assert.deepEqual(await collect(page),ids(companies),'重置不继承入口报表期间');
 await picker.locator('[data-scp-date-open]').click();await page.locator('#up-date-popover [data-range-preset=year]').click();assert.equal(await picker.locator('[data-scp-date-from]').inputValue(),(await todayOf(page)).slice(0,4)+'-01-01');assert.equal(await picker.locator('[data-scp-date-to]').inputValue(),await todayOf(page),'本年快捷日期截至今天');await reset();
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1080});await picker.locator('[data-scp-date-open]').click();assert(await page.locator('#up-date-popover').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}),'全局日历不越界 '+width);await page.keyboard.press('Escape');
  const geometry=await page.locator('.scp-member-filters').evaluate(node=>[...node.children].filter(n=>!n.hidden).map(n=>({x:n.getBoundingClientRect().left,y:n.getBoundingClientRect().top,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,reset:n.hasAttribute('data-scp-member-reset')})));
  const fields=geometry.filter(n=>!n.reset);assert(fields.every(n=>Math.abs(n.h-36)<1),'所有字段等高 '+width);
  if(width>1100){const columns=5;fields.slice(5).forEach((f,i)=>assert(Math.abs(f.x-fields[i%columns].x)<1,'日期字段按上方网格列对齐'));}
  assert(await page.locator('#dialogbody').evaluate(node=>node.scrollWidth<=node.clientWidth+1),'筛选区不撑宽抽屉 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 await picker.locator('[data-scp-date-open]').click();await page.locator('#up-date-popover [data-range-preset=year]').click();
 await page.locator('.scp-member-filters').screenshot({path:fileURLToPath(new URL('../../outputs/supplier-filter-alignment.png',import.meta.url))});
 await picker.locator('[data-scp-date-open]').click();await page.locator('#up-date-popover').screenshot({path:fileURLToPath(new URL('../../outputs/supplier-shared-calendar.png',import.meta.url))});await page.keyboard.press('Escape');await reset();
 console.log('通过：全局双月日历、年初至今天/累计截止日、历史年份季度、日期交集与双Tab状态、筛选字段对齐');
}
