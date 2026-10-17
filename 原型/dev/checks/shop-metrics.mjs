import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function verifyShopMetrics(page){
 const diagnosisContext=vm.createContext({fmt:(n,d=0)=>Number(n).toFixed(d),upPercent:n=>n+'%',pfMoneyYuan:n=>n+'元',rpQualityChange:(a,b)=>b?((a-b)/b*100)+'%':'—',sdRoles:()=>[],rpShopScoreTone:(_,s)=>s>=4.8?'rp-quality-green':'rp-quality-yellow'});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shop-detail/01-diagnosis.js',import.meta.url),'utf8'),diagnosisContext);
 const shop={channel:'抖音',score:4.9,productScore:4.9,logisticsScore:4.8,serviceScore:4.9};
 const facts={gsv:100,netSales:80,violations:0,fine:0,frozen:0,frozenCount:0,offShelf:0,drop:0,limited:0};
 const model={shop,current:facts,previous:facts,returnRate:10,previousReturnRate:10,events:[]};
 const stable=diagnosisContext.sdDiagnosis(model,{});
 assert(stable.summary.includes('维持现有经营节奏'));assert(!stable.actions.includes('品质中心'),'无依据时不机械派单');
 const low=diagnosisContext.sdDiagnosis({...model,shop:{...shop,score:4.6}},{});
 assert(!low.dimensions.flat().join('').includes('持续下降'),'单次评分不冒充趋势');
 assert(low.actions.includes('已有违规原因'),'评分低不能直接分配责任');
 const restricted=diagnosisContext.sdDiagnosis({...model,current:{...facts,netSales:50,violations:1,frozenCount:1,frozen:100},events:[{reasonType:'quality'}]},{});
 assert(restricted.summary.includes('优先核实限制状态'));assert(!restricted.summary.includes('违规导致'),'同期变化不冒充因果');
 assert(restricted.dimensions.flat().join('').includes('不能按历史次数认定仍受限'));
 assert(restricted.actions.includes('品质中心：'),'品质原因明确时列出品质部门动作');
 assert(!low.actions.includes('用户中心：'),'单次服务评分不能直接派定服务责任');
 const logistics=diagnosisContext.sdDiagnosis({...model,current:{...facts,violations:1},events:[{reasonType:'logistics'}]},{});
 assert(logistics.actions.includes('发货部：'));assert(!logistics.actions.includes('品质中心：'));
 diagnosisContext.sdRoles=()=>[{department:'抖音二区',role:'负责人'}];
 assert(diagnosisContext.sdDiagnosis(model,{}).actions.startsWith('店铺负责人：'),'牵头主体统一显示店铺负责人');
 const combined=diagnosisContext.sdDiagnosis({...model,shop:{...shop,score:4.6},current:{...facts,violations:1},returnRate:12},{}).actions;
 assert.equal((combined.match(/店铺负责人：/g)||[]).length,1,'同一店铺负责人的行动合并为一条');
 for(const text of ['逐项确认违规对象','已有违规原因','按店内SPU列出重点商品'])assert(combined.includes(text),'合并保留具体行动：'+text);
 const idle=diagnosisContext.sdDiagnosis({...model,current:{...facts,gsv:0,netSales:0}},{});assert(idle.summary.includes('先核对经营状态'));
 const ctx={DATA_CUTOFF:'2026-10-10',riskRange:(start,end)=>({start,end}),shiftDate:(s,n)=>new Date(Date.parse(s)+n*86400000).toISOString().slice(0,10),
  sampleShopProducts:()=>[{spuId:'A',spuCode:'A'},{spuId:'B',spuCode:'B'}],riskShopPeriod:(_,r)=>({points:[{date:r.start,gsv:1.234567},{date:r.end,gsv:2.345678}]}),
  sampleShopSpuSales:(_,d)=>[{product:{spuId:'A'},sales:d.endsWith('01')?10:100,returned:d.endsWith('01')?5:1},{product:{spuId:'B'},sales:20,returned:2}]};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../../src/modules/shop-detail/01-operating.js',import.meta.url),'utf8'),ctx);
 const f=ctx.sdOperatingFacts({id:1},'2026-10-01','2026-10-02');
 assert.equal(f.products.reduce((n,r)=>n+r.gsvCents,0),f.points.reduce((n,r)=>n+r.gsvCents,0));
 assert.equal(f.products.reduce((n,r)=>n+r.netSales,0),140);
 const weekly=ctx.sdTrendRows(f.points,'quarter');assert.equal(weekly.length,1);assert.equal(weekly[0].returnRate,10/150*100);assert.equal(weekly[0].netSales,140);
 assert.equal(ctx.sdTrendRows([{date:'2026-01-31',sales:0,returned:0,gsvCents:0},{date:'2026-02-01',sales:1,returned:0,gsvCents:100}], 'year').length,2);
 assert.equal(ctx.sdTrendRows([{date:'2026-01-01',sales:0,returned:0,gsvCents:0}], 'year')[0].returnRate,null);
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.riskitem='1,4';document.body.append(b);b.click();b.remove()});
 const root=page.locator('.sd-detail');await root.waitFor();
 await page.locator('.up-detail-period [data-drawer-time-mode="quarter"]').click();await page.locator('.up-detail-period [data-drawer-time-value]').selectOption('3');
 assert.equal(await root.locator('[data-up-trend-point]').count(),24);
 await page.locator('.up-detail-period [data-drawer-time-mode="year"]').click();assert.equal(await root.locator('[data-up-trend-point]').count(),24);
 await root.locator('[data-drawer-tab="violations"]').click();
 for(const key of ['fine','frozen']){const item=root.locator(`[data-up-quality-metric="${key}"] strong`),red=await item.evaluate(e=>e.classList.contains('rp-quality-red'));assert.equal(await item.evaluate(e=>getComputedStyle(e).color),red?'rgb(255, 49, 87)':'rgb(134, 147, 164)')}
 await page.locator('#close').click();
}
