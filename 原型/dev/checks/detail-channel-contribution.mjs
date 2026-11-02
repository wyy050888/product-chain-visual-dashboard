import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyChannelContribution(page){
 const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/05-channel-contribution.js',import.meta.url),'utf8'),context);
 const model=context.upChannelContributionModel;
 for(const [values,shares] of [[[20,80],[20,80]],[[-20,-80],[20,80]],[[120,-20],[120,-20]],[[20,-120],[-20,120]],[[0,0],[null,null]],[[20,-20],[null,null]]]){
  const result=model(values.map((n,i)=>({channel:String(i),gsvCents:n,profitCents:n})));
  assert.deepEqual(Array.from(result.rows,r=>r.gsvShare),shares);assert.deepEqual(Array.from(result.rows,r=>r.profitShare),shares);
  assert(result.rows.every(r=>r.gsvShare===null||Math.abs(r.gsvShare)/result.scale<=1),'负值/超过100%的条长仍有界');
 }
 const missing=model([{channel:'missing'},{channel:'zero',gsvCents:0,profitCents:0}]);assert.equal(missing.rows[0].gsvShare,null);assert.equal(model([]).totals.profitCents,null);
 const section=page.locator('.up-channel-section'),chart=section.locator('.up-channel-contribution');
 assert.deepEqual(await section.locator('h3').allTextContents(),['产品分平台业绩']);assert.equal(await page.locator('.up-channel-gsv').count(),0,'移除旧GSV条形图');
 assert.deepEqual(await chart.locator('.up-contribution-heading>span').allTextContents(),['平台','GSV贡献占比','利润值贡献占比']);
 const data=await chart.locator('li').evaluateAll(es=>es.map(e=>({name:e.dataset.upContributionChannel,gsv:e.dataset.gsvCents===''?null:+e.dataset.gsvCents,profit:e.dataset.profitCents===''?null:+e.dataset.profitCents,shares:[...e.querySelectorAll('[data-up-share]')].map(n=>n.dataset.shareValue===''?null:+n.dataset.shareValue)})));
 const table=await section.locator('tbody tr').evaluateAll(es=>es.map(e=>[e.cells[0].textContent,e.cells[1].textContent]));
 assert.equal(data.length,6);assert.deepEqual(data.map(r=>r.name),table.map(r=>r[0]),'图表与表格顺序相同');
 const company={gsvCents:Number(await chart.getAttribute('data-total-gsv')),profitCents:Number(await chart.getAttribute('data-total-profit'))};
 const expected=model(data.map(r=>({channel:r.name,gsvCents:r.gsv,profitCents:r.profit})),company);
 const partial=model([{channel:'快手',gsvCents:20,profitCents:10}],{gsvCents:100,profitCents:50});assert.equal(partial.rows[0].gsvShare,20);assert.equal(partial.rows[0].profitShare,20);
 assert.equal(Number(await chart.getAttribute('data-total-gsv')),expected.totals.gsvCents);assert.equal(Number(await chart.getAttribute('data-total-profit')),expected.totals.profitCents);
 for(const [i,row] of data.entries()){
  assert.deepEqual(row.shares,[expected.rows[i].gsvShare,expected.rows[i].profitShare]);
  if(row.gsv===null)assert.equal(table[i][1],'—');
  else {const text=table[i][1],parsed=parseFloat(text.replaceAll(',',''))*(text.includes('w')?1000000:100);assert(Math.abs(parsed-row.gsv)<=50000,'图表GSV与表格金额同源')}
 }
 if(expected.totals.profitCents<0)assert.match(await section.locator('.up-channel-heading .up-contribution-note').innerText(),/利润合计为负/);
 const totalGsv=data.filter(r=>r.gsv!==null).reduce((sum,r)=>sum+r.gsv,0);if(totalGsv)assert(Math.abs(data.reduce((sum,r)=>sum+(r.shares[0]||0),0)-totalGsv/company.gsvCents*100)<1e-8);
 for(const width of [1920,1440,1100,390]){
  await page.setViewportSize({width,height:1080});
  const bounds=await section.evaluate(e=>{const table=e.querySelector('.up-platform-performance').getBoundingClientRect(),chart=e.querySelector('.up-channel-contribution').getBoundingClientRect();return {table:table.toJSON(),chart:chart.toJSON()}});
  if(width>1200)assert(bounds.table.right<bounds.chart.left&&Math.abs(bounds.table.top-bounds.chart.top)<1,'桌面表格左/贡献图右 '+width);
  else assert(bounds.table.bottom<=bounds.chart.top,'窄屏按表格、贡献图顺序排列');
  assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'正文不溢出 '+width);
  if(expected.totals.profitCents<0){
   const note=await section.locator('.up-contribution-note').boundingBox(),heading=await section.locator('.up-channel-heading').boundingBox();
   assert(Math.abs(note.x+note.width-heading.x-heading.width)<2,'提示位于右上角 '+width);
   assert(note.y+note.height<=Math.min(bounds.table.top,bounds.chart.top),'提示不遮挡表图 '+width);
   assert.equal(await chart.locator('.up-contribution-note').count(),0,'图底部不重复提示');
  }
  assert(await chart.locator('.up-contribution-half').evaluateAll(es=>es.every(e=>{const track=e.querySelector('.up-contribution-track').getBoundingClientRect(),bar=e.querySelector('i').getBoundingClientRect();return bar.width<=track.width+1})), '条形不溢出');
 }
 await page.setViewportSize({width:1920,height:1080});
}
