import assert from 'node:assert/strict';
// 仅检查店铺诊断口径，处罚筛选与经营指标另有专项覆盖。
export async function shopPddDiagnosis(page){
 await page.clock.setFixedTime(new Date('2026-10-31T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 const root=page.locator('.sd-detail');
 for(const [id,channel] of [[6,'拼多多'],[4,'抖音'],[3,'快手'],[5,'视频号'],[2,'天猫'],[1,'京东']]){
  await page.evaluate(id=>{const b=document.createElement('button');b.dataset.riskitem='1,'+id;document.body.append(b);b.click();b.remove()},id);await root.waitFor();
  const body=await root.locator('[data-sd-ai-content]').innerText(),labels=await root.locator('.sd-diagnosis-dimension>b').allTextContents();
  assert.deepEqual(labels,[channel==='拼多多'?'核心链接':'评分','业绩','违规']);
  await root.locator('[data-sd-prompt]').click();const prompt=await root.locator('.up-ai-prompt-dialog pre').innerText();
  if(channel==='拼多多'){
   assert.doesNotMatch(prompt+body,/店铺分|商品分|物流分|服务分|评分/);
   for(const word of ['品质退款率','品质求助平台率','品质文本情感分','六项','待补数据','不把“已超越30%同行”'])assert(prompt.includes(word));
   const links=await page.evaluate(id=>pddShopLinksSnapshot(id).all,id);
   assert(body.includes(links.filter(l=>l.assessment==='red').length+'条红灯链接'));
   assert(body.includes(links.filter(l=>l.assessment==='yellow').length+'条黄灯链接'));
   assert.match(body,/近30日（(?:2026|26)[/-]10[/-]02 — (?:2026|26)[/-]10[/-]31）/);
   assert.equal((body.match(/店铺负责人：/g)||[]).length,1);
  }else{for(const word of ['店铺分','商品分','物流分','服务分'])assert(prompt.includes(word));assert(body.includes('最新可用评分'))}
  await page.keyboard.press('Escape');await page.locator('#close').click();
 }
}
