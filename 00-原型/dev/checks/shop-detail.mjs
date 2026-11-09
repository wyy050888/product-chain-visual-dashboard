import {verifyShopLinkDetails} from './shop-link-details.mjs';
import {verifyShopProductSort} from './shop-core-products.mjs';
import {verifyShopMetrics} from './shop-metrics.mjs';
import assert from 'node:assert/strict';
import {readAiPrompts} from '../ai-strategy-prompts.mjs';
import {fileURLToPath} from 'node:url';
export async function shopDetail(page){
 // 固定截图样例的截止日；实时跨日由 dynamicDates 专项验证。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const root=page.locator('.sd-detail');
 // 通过统一详情事件覆盖六渠道；绿色店铺未必在当前高危榜中。
 const open=async id=>{await page.evaluate(id=>{const b=document.createElement('button');b.dataset.riskitem='1,'+id;document.body.append(b);b.click();b.remove()},id);await root.waitFor()};
 const close=()=>page.locator('#close').click();
 const prompts=new Set();
 for(const [id,channel] of [[4,'抖音'],[3,'快手'],[5,'视频号'],[2,'天猫'],[1,'京东'],[6,'拼多多']]){
  await open(id);assert.equal(await page.locator('#dialogtitle').innerText(),'店铺详情');
  assert.deepEqual(await root.locator('.drawer-tabs [data-drawer-tab]').allTextContents(),['业绩表现','店铺违规']);
  const fields=await root.locator('.up-hero dl dt').allTextContents();assert(!fields.includes('平台')&&!fields.includes('链群'),'店铺头部不展示平台和链群文字字段');assert.equal(await root.locator('.up-product-heading .rp-platform-mark').getAttribute('alt'),channel,'所属平台使用名称旁图标表示');
  const scores=root.locator('[data-sd-scores]');
  if(channel==='拼多多'){
   assert.deepEqual(await scores.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),['redLinks','yellowLinks']);
   const links=await page.evaluate(id=>pddShopLinksSnapshot(id).all,id);
   for(const [key,tone] of [['redLinks','red'],['yellowLinks','yellow']]){
    const count=scores.locator('[data-rp-field="'+key+'"] strong');
    assert.equal(Number(await count.innerText()),links.filter(link=>tone==='red'?link.redCount>=3:link.redCount>0&&link.redCount<3).length);
   }
   assert.equal(await scores.locator('[data-rp-pdd-shop]').count(),0);
   const diagnosis=await root.locator('[data-sd-ai-content]').innerText();
   assert.doesNotMatch(diagnosis,/店铺分|商品分|物流分|服务分|评分/,'拼多多诊断不套用其他平台四项评分');
   assert(diagnosis.includes(links.filter(link=>link.assessment==='red').length+'条红灯链接'));
   assert(diagnosis.includes(links.filter(link=>link.assessment==='yellow').length+'条黄灯链接'));

  }else{
   const keys=['score','productScore','logisticsScore','serviceScore'];
   assert.deepEqual(await scores.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),keys);
   const shop=await page.evaluate(id=>shopRiskAudit().find(s=>s.id===id),id);
   for(const key of keys)assert.equal(await scores.locator('[data-rp-field="'+key+'"] strong').innerText(),shop[key].toFixed(2));
   assert.equal(await scores.locator('[data-rp-pdd-shop]').count(),0);
   if(channel==='视频号'){
    assert.equal(await scores.locator('.rp-quality-red,.rp-quality-yellow,.rp-quality-green').count(),0,'视频号评分使用普通数值样式');
    const diagnosis=await root.locator('[data-sd-ai-content]').innerText();
    for(const label of ['店铺分','商品分','物流分','服务分'])assert(diagnosis.includes(label),'诊断保留 '+label+'原值');
    assert.doesNotMatch(diagnosis,/达到本平台配置的绿色|评分短板|最低为|改善评分|评分红灯|评分黄灯/);
   }
  }
  await page.setViewportSize({width:390,height:900});
  const scoreBox=await scores.boundingBox(),bodyBox=await page.locator('#dialogbody').boundingBox();
  assert(scoreBox.x>=bodyBox.x&&scoreBox.x+scoreBox.width<=bodyBox.x+bodyBox.width+1,'顶部指标窄屏不溢出：'+channel);
  await page.setViewportSize({width:1920,height:1080});

  const heroText=await root.locator('.up-hero dl').innerText();
  if(channel==='视频号')assert.doesNotMatch(heroText,/负责人|店铺推广|店铺策略/);
  else if(channel==='抖音')assert.match(heroText,/负责人[\s\S]*抖音[一二三]区-/);
  else if(channel==='快手')assert.match(heroText,/负责人[\s\S]*剪运[一二三]区-/);
  else{assert.match(heroText,/店铺推广[\s\S]*品牌[一二三]区-/);assert.match(heroText,/店铺策略[\s\S]*品牌[一二三]区-/)}
  const geometry=await root.evaluate(e=>({hero:e.querySelector('.up-hero').getBoundingClientRect().bottom,tabs:e.querySelector('.drawer-tabs').getBoundingClientRect().top}));assert(geometry.hero<=geometry.tabs);
  assert(await root.locator('[data-sd-ai-content]').isVisible());await root.locator('[data-sd-ai-toggle]').click();assert(await root.locator('[data-sd-ai-content]').isHidden());await root.locator('[data-sd-ai-toggle]').click();
  await root.locator('[data-sd-prompt]').click();assert(await root.locator('.up-ai-prompt-dialog:not([data-up-ai-evidence-dialog])').isVisible());const prompt=await root.locator('.up-ai-prompt-dialog pre').innerText();assert.equal(prompt,'当前平台：'+channel+'。仅应用该平台对应条款。\n\n'+readAiPrompts().shop);assert.deepEqual(await root.locator('.sd-diagnosis-dimension>b').allTextContents(),[channel==='拼多多'?'核心链接':'评分','业绩','违规']);assert.deepEqual(await root.locator('.up-ai-section>strong').allTextContents(),['经营结论','问题分析','部门行动']);assert.doesNotMatch(await root.locator('[data-sd-ai-content]').innerText(),/批次|直播场次|首响|私域|客服根因待核实|undefined/);prompts.add(prompt);await page.keyboard.press('Escape');assert(await root.isVisible());
  assert.equal(await root.locator('[data-ai-history]').count(),0,'店铺诊断不外露生成及保存状态');
  await root.locator('[data-up-ai-evidence]').click();const basis=root.locator('[data-up-ai-evidence-dialog]');assert(await basis.isVisible());assert((await basis.innerText()).includes('店铺ID'));assert((await basis.innerText()).includes(channel));assert.equal(await basis.locator('pre').count(),0);
  const basisBounds=await basis.boundingBox();assert(Math.abs(basisBounds.y)<1&&Math.abs(basisBounds.x+basisBounds.width-page.viewportSize().width)<1,'店铺依据使用右侧抽屉');
  assert.deepEqual(await basis.locator('.up-ai-source-table>thead').first().locator('th').allTextContents(),['来源','内容']);
  assert(await basis.locator('.gd-source-type').first().isVisible(),'店铺来源名称不能被文案整理隐藏');
  assert(!/原型数据|原型档案|模拟资料/.test(await basis.innerText()));assert((await basis.innerText()).includes('数智罗盘-店铺'));
  await basis.locator('[data-up-ai-evidence-target="1"]').click();assert.equal(await basis.locator('[aria-current="location"]').getAttribute('data-up-ai-evidence-target'),'1');
  await page.keyboard.press('Escape');assert(await root.isVisible());
  assert.equal(await root.locator('[data-up-series]').count(),2);await root.locator('[data-up-trend-point]').first().hover();assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','销量']);await page.mouse.move(0,0);
  const departmentActions=await root.locator('.up-ai-actions p').innerText();
  assert.equal((departmentActions.match(/店铺负责人：/g)||[]).length,1,'店铺负责人统一名称且仅列一条');
  assert.doesNotMatch(departmentActions,/抖音[一二三]区|剪运[一二三]区|品牌[一二三]区|具体部门待明确/);
  assert(await root.locator('.up-ai-mark.owner').count()>0);
  const coloredRisk=root.locator('.up-ai-mark.risk').first();assert(await coloredRisk.isVisible());
  assert(await coloredRisk.evaluate(e=>getComputedStyle(e).color!==getComputedStyle(e.parentElement).color),'风险字色与正文区分');
  assert.deepEqual(await root.locator('.sd-kpis small').allTextContents(),['GSV','销量']);assert.equal(await root.locator('.sd-kpis .up-operating-value>span').count(),2);assert.deepEqual(await root.locator('[data-sd-spu-table] th').allTextContents(),['SPU信息','GSV','销量','总退','利润率']);
  const overview=await root.locator('.sd-operating-overview').evaluate(el=>{const k=el.querySelector('.sd-kpis').getBoundingClientRect(),c=el.querySelector('.up-sales-trend').getBoundingClientRect();return {cards:k.height,chart:c.height,top:Math.abs(k.top-c.top),bottom:Math.abs(k.bottom-c.bottom)}});
  assert(overview.top<=1&&overview.bottom<=1,'折线图与两张卡片上下对齐：'+channel+' '+JSON.stringify(overview));
  assert.equal(await root.locator('[data-up-series="returnRate"],[data-up-series-toggle="returnRate"]').count(),0,'移除总退趋势及图例');
  if(id===4)await verifyShopProductSort(page);
  await root.locator('[data-drawer-tab="violations"]').click();assert(await root.locator('[data-sd-violation-quality]').isChecked());const headers=await root.locator('[data-sd-violation-table] th').allTextContents();assert(headers.includes(({抖音:'情节级别',快手:'申诉和整改状态',视频号:'信用变更',天猫:'扣分',京东:'申诉截止日期',拼多多:'赔付金额'})[channel]),channel+': '+JSON.stringify(headers));const stats=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));assert.equal(await root.locator('[data-sd-violation-table] tbody tr').count(),stats);
  if(channel==='拼多多')await verifyShopLinkDetails(page,id);else assert.equal(await root.locator('.sd-pdd-links').count(),0);
  const typeButton=root.locator('[data-sd-type]:not([data-sd-type="all"])').first(),typeLabel=await typeButton.innerText();await typeButton.click();const rows=await root.locator('[data-sd-violation-table] tbody tr').allTextContents();assert(rows.every(r=>r.includes(typeLabel)||channel==='拼多多'));
  await root.locator('[aria-label="搜索店铺违规"]').fill('不存在编号');assert.equal(await root.locator('[data-sd-violation-table] tbody tr').count(),0);await root.locator('[aria-label="搜索店铺违规"]').fill('');await root.locator('[data-sd-type="all"]').click();
  if(id===4)await page.screenshot({path:fileURLToPath(new URL('../../outputs/shop-detail-violations.png',import.meta.url))});await close();
 }
 assert.equal(prompts.size,6);
 // 主列表入口、独立期间与返回保持。
 await page.locator('#riskrail [data-risk="1"]').click();await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 await page.locator('#rf-list-table [data-riskitem]').first().click();assert.equal(await root.getAttribute('data-start'),'2026-09-01');
 const aiText=await root.locator('.up-ai-section p').allTextContents(),scope=await root.locator('.up-ai-scope').innerText();
 assert.equal(scope,'截至26/10/10');assert(aiText.join('').includes('累计GSV')&&aiText.join('').includes('近30日GSV'));
 const september=await root.locator('.sd-kpis strong').first().textContent();
 await root.locator('[data-drawer-tab="violations"]').click();const qualityCount=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));await root.locator('[data-sd-violation-quality]').uncheck();const allCount=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));assert(allCount>qualityCount);
 await root.locator('.up-detail-period [data-drawer-time-value]').selectOption('10');assert.equal(await root.getAttribute('data-start'),'2026-10-01');
 assert.notEqual(await root.locator('.sd-kpis strong').first().textContent(),september,'页面业绩继续支持日期筛选');
 assert.deepEqual(await root.locator('.up-ai-section p').allTextContents(),aiText,'AI不跟随月份变化');assert.equal(await root.locator('.up-ai-scope').innerText(),scope);
 assert.equal(await root.locator('[data-drawer-tab="handling"],[data-up-panel="handling"],#up-todo-table,[data-todo-create]').count(),0);
 await root.locator('[data-drawer-tab="operating"]').click();
 await root.locator('.up-detail-period [data-drawer-time-value]').selectOption('9');
 assert.deepEqual(await root.locator('.up-ai-section p').allTextContents(),aiText);
 await page.locator('.drawer-back').click();assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).value,9);await close();
 // 重开与刷新后仍仅保留业绩、违规两个页签。
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')||'{}'));
 const before=await records();
 for(const id of [4,1]){await open(id);assert.deepEqual(await root.locator('.drawer-tabs [data-drawer-tab]').allTextContents(),['业绩表现','店铺违规']);assert.equal(await root.locator('[data-up-panel="handling"],#up-todo-table').count(),0);await close()}
 assert.deepEqual(await records(),before,'打开店铺详情不创建或修改待办');
 await page.reload();await open(4);assert.deepEqual(await root.locator('.drawer-tabs [data-drawer-tab]').allTextContents(),['业绩表现','店铺违规']);await close();
 await verifyShopMetrics(page);
}
