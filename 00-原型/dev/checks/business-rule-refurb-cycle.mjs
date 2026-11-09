import assert from 'node:assert/strict';

// 翻新周期没有本地维护入口；旧运行记录不会因撤下页签而丢失。
export async function businessRuleRefurbCycle(page){
 await page.evaluate(()=>location.hash='#system-business-rules');
 await page.locator('[data-brc-tab="stock"]').click();
 const snapshot=await page.evaluate(()=>businessRuleConfigSnapshot());
 assert(!snapshot.sections.stock.some(section=>section.title==='翻新周期'));
 assert(!snapshot.items.some(item=>item.section==='翻新周期'));
 assert.equal(await page.locator('.brc-refurb-cycle-table').count(),0);
 for(const key of ['stock.refurbDays','stock.refurbSecond','stock.refurbThird','stock.refurbOverflow']){
  assert.equal(await page.locator('[data-brc-field="'+key+'"],[data-brc-upper="'+key+'"],[data-brc-lower="'+key+'"]').count(),0);
  assert(snapshot.definitions.some(rule=>rule.key===key&&rule.configurable===false));
 }
 assert((await page.locator('#brc-error').innerText())==='');
 console.log('通过：库存无翻新周期页签、标准周期输入或延期分档编辑；保留已有数据兼容读取。');
}
