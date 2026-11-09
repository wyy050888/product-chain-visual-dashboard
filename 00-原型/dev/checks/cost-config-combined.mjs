import assert from 'node:assert/strict';
export async function verifyCombinedCostImport(page,item){
 const audit=()=>page.evaluate(()=>costConfigAudit()),months=Array.from({length:12},(_,i)=>(i+1)+'月');
 const headers=['责任部门','数据类型','降本分类','降本指标','年度',...months,'备注'];
 const row=(type,value,metric=item.metric)=>['仓储部',type,type==='部门目标'?'':'包装降本',type==='部门目标'?'':metric,'2026',...Array(9).fill(''),value,'0','',type==='部门目标'?'':'合并导入'];
 const upload=async(rows)=>{await page.locator('#cec-import').click();await page.locator('#cec-file').setInputFiles({name:'目标与实际.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+[headers,...rows].map(r=>r.join(',')).join('\r\n'))});await page.locator('#cec-import-result .cec-import-summary').waitFor()};
 const close=()=>page.locator('[data-cec-import-close]').first().click();
 const snapshot=JSON.stringify((await audit()).store),valid=[row('部门目标','1200.34'),row('实际降本','450.12')];
 // 一侧失败不得保存另一侧；保留原始文件行号。
 await upload([headers.map((_,index)=>index===0?'仓储部':index===1?'部门目标':''),row('部门目标','9000'),row('实际降本','-1')]);
 assert.match(await page.locator('#cec-import-result').innerText(),/实际金额/);assert.equal(await page.locator('#cec-import-result tbody tr').first().locator('td').first().innerText(),'4');assert.equal(JSON.stringify((await audit()).store),snapshot);assert(await page.locator('#cec-confirm-import').isDisabled());await close();
 await upload([valid[0],valid[0]]);assert.match(await page.locator('#cec-import-result').innerText(),/重复/);assert.equal(JSON.stringify((await audit()).store),snapshot);await close();
 const invalid=row('部门目标','1');invalid[2]='包装降本';await upload([invalid]);assert.match(await page.locator('#cec-import-result').innerText(),/部门目标行/);await close();
 await upload(valid);assert.equal(await page.locator('#cec-import-result thead th').count(),8);assert.match(await page.locator('#cec-import-result').innerText(),/部门目标/);assert.match(await page.locator('#cec-import-result').innerText(),/实际降本/);assert(await page.locator('#cec-confirm-import').isDisabled());await page.locator('#cec-overwrite').check();
 await page.evaluate(()=>{window.cecNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cost-efficiency-config-v1')throw Error('blocked');return window.cecNativeSet.call(this,k,v)}});
 await page.locator('#cec-confirm-import').click();assert.match(await page.locator('#cec-import-error').innerText(),/保存失败/);assert.equal(JSON.stringify((await audit()).store),snapshot);await page.evaluate(()=>{Storage.prototype.setItem=window.cecNativeSet;delete window.cecNativeSet});
 await page.locator('#cec-confirm-import').click();let data=await audit();assert.equal(data.store.departmentTargets['warehouse|2026-10'].targetCents,120034);assert.equal(data.store.months[item.id+'|2026-10'].actualCents,45012);assert.equal(data.store.departmentTargets['warehouse|2026-11'].targetCents,0);assert.equal(data.store.months[item.id+'|2026-11'].actualCents,0);
 assert(Object.values(data.store.months).every(cell=>!Object.hasOwn(cell,'targetCents')));
 await page.locator('#cec-department').selectOption('warehouse');await page.locator('#cec-query').fill('');const parent=page.locator('[data-cec-target-department="warehouse"]');assert.equal(await parent.locator('[data-cec-period-target]').innerText(),'1,200.34');
 const toggle=page.locator('[data-cec-expand="warehouse"]');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();assert.equal(await page.locator('.cec-no-target').filter({hasText:/目标|\d/}).count(),0);assert.equal(await page.locator('[data-cec-project="'+item.id+'"] .cec-number').innerText(),'450.12');
 // 部门汇总始终为完整部门口径；按细项搜索不将总目标与部分实际混在一起。
 const actual=await parent.locator('[data-cec-department-actual]').innerText();await page.locator('#cec-query').fill(item.metric);assert.equal(await page.locator('[data-cec-target-department="warehouse"] [data-cec-department-actual]').innerText(),actual);
 for(const [mode,prefix] of [['quarter','季度'],['year','年度'],['month','月度']]){await page.locator('[data-cec-time-mode="'+mode+'"]').click();assert.deepEqual((await page.locator('#cec-head th').allTextContents()).slice(4,6),[prefix+'目标金额（元）',prefix+'实际降本金额（元）'])}
 await page.locator('[data-cec-time-value]').selectOption('10');
 const stored=JSON.stringify((await audit()).store);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('#lt-system-nav').click();await page.locator('[data-system-route="#system-cost-efficiency"]').click();assert.equal(JSON.stringify((await audit()).store),stored);assert.equal(await page.locator('[data-cec-config-view]').count(),0);
 console.log('通过：同表目标/实际原子导入、重复/错误行号/零值/存储失败、混合预览、合并展示与细项展开、搜索口径及月季年。');
}
