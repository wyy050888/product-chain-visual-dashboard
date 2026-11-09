import {verifyTargetHeader} from './target-header.mjs';
import {inspectImportWorkbook,cleanTemplateHeader} from './import-template-workbook.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function verifySampleMonths(){
 const sample={shopId:'1',linkId:'10',name:'内置样例',spuId:'S'},memory=new Map();
 const context=vm.createContext({klcCatalog:[sample],dashboardSyncDate:()=> '2026-10-22',window:{},localStorage:{getItem:key=>memory.get(key)||null}});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/core-link-config/01-model.js',import.meta.url),'utf8'),context);
 const seed=JSON.parse(JSON.stringify(context.klcSeed())),version=seed.records[0].versions[0];
 assert.equal(version.monitorMonth,'2026-10');delete version.monitorMonth;
 const read=store=>{memory.set('dashboard-core-links-v1',JSON.stringify(store));return context.klcLoad()};
 assert.equal(read(seed).records[0].versions[0].monitorMonth,'2026-10','已有浏览器内的原始样例也能补齐');
 for(const changes of [{monitorMonth:'2027-04'},{name:'用户编辑名称'},{updatedAt:'2026-10-21 12:00:00'},{to:'2026-10-21'}]){
  const copy=structuredClone(seed);Object.assign(copy.records[0].versions[0],changes);
  assert.equal(read(copy).records[0].versions[0].monitorMonth,changes.monitorMonth,'保留用户值或历史记录，不自动填写非原始样例');
 }
 const custom=structuredClone(seed);custom.records[0].linkId='999';assert.equal(read(custom).records[0].versions[0].monitorMonth,undefined,'不补造手工导入链接的月份');
}
export async function coreLinks(page){
 verifySampleMonths();
 const keys=['dashboard-core-links-v1','dashboard-import-history-v1'];
 const original=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),keys);
 const audit=()=>page.evaluate(()=>coreLinkConfigSnapshot());
 const headers=['月份','商品链接名称','链接ID','店铺名称','店铺ID'];
 const csv=rows=>Buffer.from('\uFEFF'+rows.map(row=>row.map(value=>JSON.stringify(String(value))).join(',')).join('\r\n'));
 const upload=async rows=>{await page.locator('#klc-file').setInputFiles({name:'按月覆盖.csv',mimeType:'text/csv',buffer:csv([headers,...rows])})};
 const close=()=>page.locator('#klc-import-dialog [data-klc-close]').first().click();
 const confirm=async()=>{await page.locator('#klc-confirm-import').click();await page.waitForFunction(()=>!document.getElementById('klc-import-dialog').hasAttribute('aria-busy'))};
 try{
  await page.evaluate(key=>localStorage.removeItem(key),keys[0]);await page.reload();await page.evaluate(()=>location.hash='#system-core-links');
  await verifyTargetHeader(page,'#klc-page','核心链接导入',['拼多多']);
  assert.deepEqual(await page.locator('#klc-page .klc-table thead th').allTextContents(),['月份','商品信息','所属店铺','更新人','更新时间','操作']);
  assert.equal(await page.locator('[data-klc-edit],#klc-editor,#klc-save').count(),0);
  assert.equal(await page.locator('#klc-body tr').first().locator('td').first().getAttribute('data-klc-month'),'');
  const before=await audit(),known=before.rows.find(row=>row.spuId),month=known.monitorMonth,display=month.replace('-','/');
  const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const second=next.toISOString().slice(0,7);next.setUTCMonth(next.getUTCMonth()+1);const third=next.toISOString().slice(0,7);
  const row=(period,id=known.linkId,name='按月导入链接')=>[period.replace('-','/'),name,id,'店铺展示名称',known.shopId];
  await page.locator('#klc-month').click();await page.locator('#klc-month-panel [data-natural-value="'+Number(month.slice(5,7))+'"]').click();assert((await page.locator('#klc-body [data-klc-month]').allTextContents()).every(value=>value===display));await page.locator('#klc-reset').click();
  await page.locator('#klc-import').click();await page.locator('.klc-import-notice').waitFor();assert.match(await page.locator('.klc-import-notice').innerText(),/覆盖.*全部已有数据.*未列出的链接.*其他月份不变/);
  const baseline=JSON.stringify(await audit());
  for(const rows of [[row(month),row(month)],[row('2026-13')],[['2026-10','链接','123','店铺',known.shopId]]]){await upload(rows);await confirm();assert.match(await page.locator('.ui-import-feedback').innerText(),/导入失败/);assert.equal(JSON.stringify(await audit()),baseline)}
  await upload([row(second),row(third)]);assert(await page.locator('#klc-confirm-import').isEnabled(),'新月份无旧数据，不要求覆盖确认');await confirm();
  let data=await audit();assert.equal(data.rows.length,before.rows.length+2);assert.equal(data.rows.filter(r=>r.shopId===known.shopId&&r.linkId===known.linkId).length,3,'同一链接可同时存在不同月份');
  const untouched=data.rows.filter(r=>r.monitorMonth===third),oldMonth=data.rows.filter(r=>r.monitorMonth===month);
  await page.locator('#klc-query').fill(known.linkId);await page.locator('#klc-shop').fill(known.shopId);
  await page.locator('#klc-import').click();const longId='799999900123456789012345678901';
  await upload([row(month,known.linkId,'当月替换'),row(second,longId,'次月替换')]);
  assert(await page.locator('#klc-confirm-import').isEnabled());await close();assert.deepEqual(await audit(),data,'取消整月覆盖不修改数据');
  await page.locator('#klc-import').click();await upload([row(month,known.linkId,'当月替换'),row(second,longId,'次月替换')]);
  await page.evaluate(()=>{window.klcSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dashboard-core-links-v1')throw Error('quota');return window.klcSet.call(this,key,value)}});
  await confirm();assert.match(await page.locator('.ui-import-feedback').innerText(),/导入失败/);assert.deepEqual(await audit(),data,'保存失败不能部分覆盖');
  await page.evaluate(()=>{Storage.prototype.setItem=window.klcSet;delete window.klcSet});await confirm();
  data=await audit();assert.equal(data.rows.filter(r=>r.monitorMonth===month).length,1,'文件覆盖整个月份，与页面搜索、店铺过滤无关');assert.equal(data.rows.filter(r=>r.monitorMonth===second).length,1);assert.deepEqual(data.rows.filter(r=>r.monitorMonth===third),untouched,'文件外月份完整保留');
  assert.equal(data.rows.find(r=>r.monitorMonth===month).spuId,known.spuId);assert.equal(data.rows.find(r=>r.monitorMonth===second).linkId,longId);
  const affected=await page.evaluate(()=>coreLinkConfigSnapshot().links);assert.equal(affected.filter(r=>r.shopId===known.shopId&&r.monitorMonth===month&&r.linkId===known.linkId).length,1,'前台消费同月最新核心链接');
  const committed=await audit();await page.reload();assert.deepEqual(await audit(),committed,'刷新保留整月替换结果及其他月份');
  await page.locator('#klc-reset').click();await page.locator('#klc-query').fill(known.linkId);const secondBefore=(await audit()).rows.filter(r=>r.monitorMonth===third);
  const target=page.locator('#klc-body tr').filter({has:page.locator('[data-klc-month]',{hasText:display})});await target.locator('[data-klc-remove]').click();await page.locator('#klc-remove-confirm').click();
  assert.equal((await audit()).rows.filter(r=>r.monitorMonth===month).length,0);assert.deepEqual((await audit()).rows.filter(r=>r.monitorMonth===third),secondBefore,'移除只操作当前月份');
  for(const width of [1920,1366,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))}
  await page.setViewportSize({width:1920,height:1080});
 }finally{
  await page.evaluate(({keys,original})=>{if(window.klcSet){Storage.prototype.setItem=window.klcSet;delete window.klcSet}keys.forEach((key,i)=>original[i]===null?localStorage.removeItem(key):localStorage.setItem(key,original[i]))},{keys,original});await page.reload();
 }
 console.log('通过：月份首列、去除编辑、整月跨店铺覆盖、多月份/同链接隔离、取消和失败回滚、SPU关联及长ID、前台消费与持久化。');
}
