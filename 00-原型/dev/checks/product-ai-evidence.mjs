import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function productAiEvidence(page){
 await page.clock.setFixedTime(new Date('2026-11-06T02:30:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#riskrail [data-risk="0"]').click();await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 const product=page.locator('.up-detail'),summary=product.locator('.up-ai-summary'),button=summary.locator('[data-up-ai-evidence]'),dialog=summary.locator('[data-up-ai-evidence-dialog]');
 const id=await product.getAttribute('data-up-spu');
 const read=()=>page.evaluate(id=>{const stream=aiResultHistoryAudit().streams['product|'+id];return {versions:stream.revisions.length,payload:stream.revisions.at(-1).payload}},id);
 const before=await read();assert(before.payload.evidence);assert.equal(before.payload.evidence.product.id,id);
 const operating=before.payload.evidence.items.find(i=>i.section==='经营结论').sources[0].content;
 assert(operating.includes(before.payload.analysis.gsv));assert(operating.includes(before.payload.analysis.margin),'经营结论的依据须对应本次保存的同产品指标');
 await button.click();assert(await dialog.isVisible());assert.equal(await button.getAttribute('aria-expanded'),'true');
 const bounds=await dialog.boundingBox(),viewport=page.viewportSize();
 assert(Math.abs(bounds.y)<1&&Math.abs(bounds.x+bounds.width-viewport.width)<1,'依据抽屉贴右并占满视口高度');
 assert(Math.abs(bounds.height-viewport.height)<1&&bounds.width<=960,'桌面抽屉宽度不超过960px');
 assert.equal(await summary.locator('[data-ai-history]').count(),0,'产品诊断不外露生成及保存状态');
 const body=dialog.locator('[data-up-ai-evidence-body]'),original=await body.innerText();
 assert.deepEqual(await body.locator('.up-ai-source-table>thead').first().locator('th').allTextContents(),['来源','内容']);
 assert(await body.locator('.gd-source-type').first().isVisible(),'来源名称不能被文案整理隐藏');
 await body.locator('[data-up-ai-evidence-target="2"]').click();
 assert.equal(await body.locator('[aria-current="location"]').getAttribute('data-up-ai-evidence-target'),'2','点击部门行动定位到对应依据');
 assert(await body.evaluate(el=>el.scrollTop>0),'板块定位仅滚动依据正文');
 await body.locator('[data-up-ai-evidence-target="0"]').click();
 assert.deepEqual(await body.locator('.up-ai-evidence-section>h5').allTextContents(),['经营结论','问题分析','部门行动']);
 assert(original.includes(before.payload.evidence.product.name));assert(original.includes(before.payload.evidence.cutoff)||original.includes(before.payload.evidence.cutoff.slice(2).replaceAll('-','/')));assert(original.includes('本次生成'));
 assert(await body.locator('.up-ai-evidence-item').count()>3);assert(await body.locator('.up-ai-evidence-item').evaluateAll(items=>items.every(item=>item.querySelector('.up-ai-source p')?.textContent.trim())));
 assert(!/原型数据|原型档案|模拟资料/.test(original));assert(original.includes('数智罗盘-产品结构'));assert(original.includes('分析建议'));assert.equal(await body.locator('pre').count(),0);assert(!/"strategy"|[a-f0-9]{64}/.test(original));
 const after=await read();assert.deepEqual(after,before,'查看依据不创建版本或改写保存数据');
 await page.keyboard.press('Escape');assert(!(await dialog.isVisible()));assert(await product.isVisible());assert.equal(await button.getAttribute('aria-expanded'),'false');
 await page.locator('#up-platform').evaluate(el=>{el.value='天猫';el.dispatchEvent(new Event('change',{bubbles:true}))});await summary.locator('[data-up-ai-evidence]').click();assert.equal(await dialog.locator('[data-up-ai-evidence-body]').innerText(),original,'页面换平台不替换本次保存的分析依据');
 await page.setViewportSize({width:390,height:844});assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'窄屏依据弹窗无横向溢出');
 await dialog.locator('[data-up-ai-evidence-close]').click();assert(await product.isVisible());
 const box=vm.createContext({esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/04-ai-evidence-sources.js',import.meta.url),'utf8'),box);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/04-ai-evidence-view.js',import.meta.url),'utf8'),box);
 assert(box.upAiEvidenceMarkup(null,id).includes('未保存'));assert(box.upAiEvidenceMarkup(before.payload.evidence,'other-product').includes('与当前主体不一致'));
}
