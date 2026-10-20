import {verifyTargetHeader} from './target-header.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pddLinks} from './pdd-links.mjs';
export async function coreLinks(page){
 const storage='dashboard-core-links-v1',audit=()=>page.evaluate(()=>window.coreLinkConfigSnapshot()),editor=page.locator('#klc-editor');
 await page.evaluate(k=>localStorage.removeItem(k),storage);await page.reload();await pddLinks(page);
 await page.locator('#riskrail [data-risk="1"]').click();assert(await page.locator('#rp-core-link-config').isVisible());
 await page.locator('#rf-list-platform').selectOption('拼多多',{force:true});await page.locator('#rp-core-link-config').click();
 assert.equal(new URL(page.url()).hash,'#system-core-links');assert(await page.locator('#overlay').isHidden());assert(await page.locator('#klc-page').isVisible());assert.equal(await page.locator('[data-system-route="#system-core-links"]').getAttribute('aria-current'),'page');
 assert.equal(await page.locator('#klc-body tr').count(),10);assert.equal(await page.locator('#klc-pagination .list-pagination').getAttribute('data-list-size'),'10');
 assert(!/启用|停用|状态|关联SPU/.test(await page.locator('#klc-page').innerText()));await verifyTargetHeader(page,'#klc-page','核心链接配置',['拼多多']);
 const before=await audit(),shopId=before.rows[0].shopId,first=before.rows[0];
 const downloadPromise=page.waitForEvent('download');await page.locator('#klc-template').click();const file=await downloadPromise;assert.equal(file.suggestedFilename(),'核心链接配置模板.csv');const template=fs.readFileSync(await file.path(),'utf8');assert(!/状态|编号|责任人|关联SPU/.test(template));
 assert.equal(await page.locator('#klc-add').count(),0);assert.deepEqual(await page.locator('#klc-page .klc-actions button').allTextContents(),['导入','下载模板']);
 await page.locator('[data-klc-edit]').first().click();assert.equal(await editor.locator('h2').innerText(),'编辑链接');assert(await editor.locator('[name=shopId]').isDisabled());assert(await editor.locator('[name=linkId]').getAttribute('readonly')!==null);await editor.locator('[name=name]').fill('编辑后的链接');await page.locator('#klc-save').click();assert.equal((await audit()).rows.length,before.rows.length);assert.equal((await audit()).rows[0].name,'编辑后的链接');
 const longId='123456789012345678901234567890';
 const upload=async rows=>{await page.locator('#klc-file').setInputFiles({name:'核心链接.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+[['所属店铺','链接ID','商品名称'],...rows].map(r=>r.join(',')).join('\r\n'))});await page.locator('[data-klc-preview] p').waitFor().catch(async()=>{throw Error(await page.locator('#klc-import-dialog').innerText())})};
 await page.locator('#klc-import').click();
 const baseline=JSON.stringify(await audit());await upload([[shopId,longId,'新增'],[shopId,longId,'重复']]);assert.match(await page.locator('[data-klc-preview]').innerText(),/重复/);assert(await page.locator('#klc-confirm-import').isDisabled());assert.equal(JSON.stringify(await audit()),baseline);
 const errDownload=page.waitForEvent('download');await page.locator('#klc-errors').click();assert.match(fs.readFileSync(await(await errDownload).path(),'utf8'),/重复/);
 await upload([[shopId,first.linkId,'导入修改'],[shopId,longId,'导入新增']]);assert(await page.locator('#klc-confirm-import').isDisabled());await page.locator('#klc-overwrite').check();
 await page.evaluate(()=>{window.klcNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard-core-links-v1')throw Error('blocked');return window.klcNativeSet.call(this,k,v)}});await page.locator('#klc-confirm-import').click();assert.match(await page.locator('#klc-import-dialog footer .klc-error').innerText(),/保存失败/);assert.equal(JSON.stringify(await audit()),baseline);await page.evaluate(()=>Storage.prototype.setItem=window.klcNativeSet);await page.locator('#klc-confirm-import').click();assert(await page.locator('#klc-import-dialog').isHidden());
 let current=await audit();assert.equal(current.rows.find(r=>r.linkId===first.linkId).name,'导入修改');
 await page.reload();current=await audit();assert(current.rows.some(r=>r.linkId===longId));
 const state=await audit(),past=await page.evaluate(()=>window.coreLinkConfigSnapshot('2026-10-09'));assert.equal(state.links.find(l=>l.id===longId).assessment,'unknown');assert.equal(state.links.find(l=>l.id===longId).metrics[0].thirdRank,'--');assert(!past.links.some(l=>l.id===longId));
 await page.locator('#klc-query').fill(longId);assert.equal(await page.locator('#klc-body tr').count(),1);await page.locator('[data-klc-edit]').click();assert.equal(await editor.locator('[name=linkId]').inputValue(),longId);await editor.locator('[name=name]').fill('导入后编辑');await page.locator('#klc-save').click();assert.equal((await audit()).rows.find(r=>r.linkId===longId).name,'导入后编辑');
 await page.locator('[data-klc-remove]').click();await page.locator('#klc-remove-confirm').click();assert(!(await audit()).rows.some(r=>r.linkId===longId));assert((await audit()).records.some(r=>r.linkId===longId));await page.locator('#klc-reset').click();

 // 真实XLSX上传，长数字字符串应完整保留。
 await page.locator('#klc-import').click();await page.locator('#klc-file').setInputFiles(fileURLToPath(new URL('../fixtures/core-links-import.xlsx',import.meta.url)));await page.locator('[data-klc-preview] p').waitFor().catch(async()=>{throw Error(await page.locator('#klc-import-dialog').innerText())});assert.match(await page.locator('[data-klc-preview]').innerText(),/新增 1 条/);await page.locator('#klc-confirm-import').click();assert((await audit()).rows.some(r=>r.linkId==='99887766554433221100998877'));
 const history=await page.evaluate(()=>window.coreLinkConfigSnapshot('2026-10-09'));assert.equal(history.rows.find(r=>r.linkId===first.linkId).name,first.name);
 for(const width of [1920,1366,390]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))}
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:fileURLToPath(new URL('../../outputs/core-links.png',import.meta.url))});
 // 名单不设20条上限，缺失数据单列展示，历史名单不随移除回写。
 await page.locator('#klc-import').click();await upload(Array.from({length:25},(_,i)=>[shopId,'8877665544332211'+String(i).padStart(3,'0'),'扩充链接'+i]));await page.locator('#klc-confirm-import').click();assert((await audit()).rows.length>20);
 let store=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),storage));store.records.forEach(r=>r.versions.forEach(v=>{if(!v.to)v.to='2026-10-10'}));store.revision++;
 await page.evaluate(({storage,store})=>localStorage.setItem(storage,JSON.stringify(store)),{storage,store});await page.reload();assert.equal((await audit()).rows.length,0);
 await page.locator('#klc-import').click();await upload([[shopId,'99998888777766665555','']]);await page.locator('#klc-confirm-import').click();
 
 await page.evaluate(()=>location.hash='#overview');await page.locator('#riskrail .rp-shop-card [data-rp-row="1:6"]').waitFor();
 const unknown=page.locator('#riskrail .rp-shop-card [data-rp-row="1:6"] .rp-shop-link-counts');assert.equal(await unknown.locator('strong').allTextContents().then(a=>a.join(' ')),'-- --');
 await page.locator('#riskrail .rp-shop-card [data-rp-row="1:6"]').click();await page.locator('[data-drawer-tab="violations"]').click();assert.equal(await page.locator('[data-sd-link-tone="unknown"] [data-rp-pdd-link]').count(),1);assert.equal(await page.locator('[data-sd-link-tone="unknown"] tbody td').allTextContents().then(a=>a.slice(1).every(v=>v==='--')),true);await page.locator('#close').click();
 store=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),storage));store.records.forEach(r=>r.versions.forEach(v=>{if(!v.to)v.to='2026-10-10'}));store.revision++;
 await page.evaluate(({storage,store})=>localStorage.setItem(storage,JSON.stringify(store)),{storage,store});await page.reload();assert.match(await page.locator('#riskrail .rp-shop-card [data-rp-row="1:6"] .rp-shop-link-counts').innerText(),/未配置核心链接/);
 await page.evaluate(k=>localStorage.removeItem(k),storage);await page.reload();
}
