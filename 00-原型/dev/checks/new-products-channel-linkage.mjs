import assert from 'node:assert/strict';
import {verifyNewProductOperatingTotals} from './new-products-overview.mjs';

// 图表、下拉框共用销售渠道条件；同一批SPU的公司业绩口径不被改写。
export async function verifyNewProductChannelLinkage(page){
 const select=page.locator('#new [data-nsp-filter="channel"]'),snapshot=()=>page.evaluate(()=>dashboardNewProductsSnapshot());
 const saved=(await snapshot()).filters.channel;
 await select.selectOption('all',{force:true});
 const baseline=await snapshot(),ids=rows=>rows.map(p=>p.spuId).sort();
 const platforms=await select.locator('option').evaluateAll(es=>es.map(e=>e.value).filter(v=>v!=='all'));
 async function verify(channel){
  const data=await snapshot(),expected=channel==='all'?baseline.visible:baseline.visible.filter(p=>p.salesChannels.includes(channel));
  assert.equal(data.filters.channel,channel);assert(!('platform' in data.filters),'不保留隐藏平台条件');
  assert.equal(await select.inputValue(),channel,'图表点击同步下拉框');
  assert.deepEqual(ids(data.visible),ids(expected),'明细与销售渠道使用同一产品条件');
  await verifyNewProductOperatingTotals(page,expected);
  const selected=page.locator('#newtop [data-nsp-channel][aria-pressed="true"]');
  assert.equal(await selected.count(),channel==='all'?0:2,'柱形与平台图标共用选中态');
  for(const value of await selected.evaluateAll(es=>es.map(e=>e.dataset.nspChannel)))assert.equal(value,channel);
  for(const [name,text] of await page.locator('#newtop svg [data-nsp-channel]').evaluateAll(es=>es.map(e=>[e.dataset.nspChannel,e.querySelector('text').textContent]))){
   const facts=expected.map(p=>p.platformFacts.find(f=>f.platform===name)?.gsvCents).filter(Number.isFinite);
   if(!facts.length){assert.equal(text,'—');continue;}
   const total=facts.reduce((sum,value)=>sum+value,0)/1000000;
   assert(Math.abs(Number(text.replaceAll(',',''))-total)<=.051,'平台图与明细产品范围同源');
  }
  assert.equal(await page.locator('#newcount .list-pagination').getAttribute('data-list-current'),'1');
 }
 for(const channel of platforms){
  await page.locator('#newtop svg [data-nsp-channel="'+channel+'"]').click();
  await verify(channel);
  const pointer=await page.locator('#newtop svg [data-nsp-channel="'+channel+'"]').evaluate(el=>({
   focused:el.matches(':focus'),keyboard:el.matches(':focus-visible'),stroke:getComputedStyle(el.querySelector('.nsp-channel-hit')).stroke,
   bar:getComputedStyle(el.querySelector('rect:not(.nsp-channel-hit)')).fill,label:getComputedStyle(el.querySelector('text')).fill
  }));
  assert(pointer.focused&&!pointer.keyboard,'鼠标点击保留焦点但不伪装键盘操作');
  assert.equal(pointer.stroke,'none','鼠标选中不叠加旧紫色焦点框');
  assert.equal(pointer.bar,pointer.label,'选中柱形与数值高亮同色');
  await page.locator('#newtop .nsp-channel-labels [data-nsp-channel="'+channel+'"]').click();
  await verify('all');
 }
 // 连续更换下拉选项不与上一次图表选择取交集。
 for(const channel of platforms){await select.selectOption(channel,{force:true});await verify(channel);}
 const last=platforms.at(-1),bar=page.locator('#newtop svg [data-nsp-channel="'+last+'"]');
 await page.keyboard.press('Tab');
 await bar.focus();await page.keyboard.press('Enter');await verify('all');
 const keyboard=await bar.evaluate(el=>({visible:el.matches(':focus-visible'),stroke:getComputedStyle(el.querySelector('.nsp-channel-hit')).stroke,dash:getComputedStyle(el.querySelector('.nsp-channel-hit')).strokeDasharray}));
 assert(keyboard.visible&&keyboard.stroke!=='none'&&keyboard.dash!=='none','键盘取消选中后仍保留独立焦点提示');
 await page.keyboard.press('Enter');await verify(last);
 await select.selectOption(saved,{force:true});
 console.log('通过：六平台柱形/图标/销售渠道双向同步、再次点击取消、键盘切换、明细与图表同源及分页归一');
}
