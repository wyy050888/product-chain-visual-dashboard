import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 覆盖五种项目的实际表格展示，并区分不适用、缺失和真实零值。
export async function verifyProjectQuoteSamples(page,ctx){
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/00-samples.js',import.meta.url),'utf8'),ctx);
 const cases=[['自研开发',[true,true,true]],['自选开发',[true,true,true]],['品质整改',[false,false,false]],['产品迭代',[false,true,false]],['研发创新',[false,false,true]]];
 const keys=['targetCosts','targetPrices','finalQuotes'],labels=['目标成本','目标售价','最终产品报价'];
 for(const [type,applicable] of cases){
  const source={id:1,type,cost:null,price:null},before=JSON.stringify(source),sample=ctx.ppSampleQuotes(source);
  assert.equal(JSON.stringify(source),before,'补充样例不能改原记录');
  keys.forEach((key,i)=>assert.equal(ctx.ppQuoteLines(sample,key).length>0,applicable[i],type+' '+labels[i]));
  await page.locator('[data-pp-reset]').click();
  await page.locator('[data-pp-type-tab="'+type+'"]').click();
  const rows=page.locator('[data-pp-row]');assert(await rows.count()>0,type+'需要有可核对的样例');
  for(const row of await rows.all()){
   for(let i=0;i<keys.length;i++){
    const value=(await row.locator('[data-label="'+labels[i]+'"]').innerText()).trim();
    if(applicable[i])assert.match(value,/\d+\.\d{2}元/,type+' '+labels[i]+'显示已有值或适用样例');
    else assert.equal(value,'--',type+' '+labels[i]+'不适用');
   }
  }
 }
 const real={id:2,type:'自研开发',cost:0,price:0,targetCosts:[],finalQuotes:[]};
 const adapted=ctx.ppSampleQuotes(real);
 assert.equal(adapted.cost,0);assert.equal(adapted.price,0);
 assert.equal(adapted.targetCosts,real.targetCosts);assert.equal(adapted.finalQuotes,real.finalQuotes);
 assert.deepEqual(Array.from(ctx.ppQuoteLines({type:'自研',targetCosts:[]},'targetCosts')),[],'适用但空数组仍缺失，不补造');
 assert.match(ctx.ppQuoteLines({type:'自研',cost:0},'targetCosts')[0],/^0\.00元$/,'真实零金额可展示');
 assert.equal(ctx.ppQuoteLines({type:'创新研发',cost:123},'targetCosts').length,0,'类型别名也遵守不适用范围');
 await page.locator('[data-pp-reset]').click();
}
