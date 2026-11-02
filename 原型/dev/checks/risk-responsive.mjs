import assert from 'node:assert/strict';

// 检查真实标签、数值和几何位置，覆盖品质三列/单列及库存两列/单列切换两侧。
export async function riskResponsive(page){
 const original=page.viewportSize(),widths=[2560,1920,1800,1799,1680,1440,1280,1201,1200,1024,901,900,768,601,600,390,320];
 let reference;
 try{
  await page.locator('a[href="#risk"]').click();
  for(const width of widths){
   await page.setViewportSize({width,height:1080});
   const cards=await page.locator('#riskrail .riskcard').evaluateAll(nodes=>{
    const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).display!=='none';
    return nodes.map(card=>{
     if(card.classList.contains('rp-platform-board'))return {
      kind:Number(card.dataset.rpBoard),platformMatrix:true,width:card.clientWidth,overflow:card.scrollWidth-card.clientWidth,headerBottom:card.querySelector('.rhead').getBoundingClientRect().bottom,headed:false,names:[],rows:[...card.querySelectorAll('.rp-platform-product')].map(row=>({id:row.dataset.rpRow,top:row.getBoundingClientRect().top,bottom:row.getBoundingClientRect().bottom,metrics:[...row.querySelectorAll('[data-rp-field]')].map(metric=>({key:metric.dataset.rpField,value:metric.querySelector('strong').textContent.trim(),comparison:metric.querySelector('small').textContent.trim(),overflow:metric.scrollWidth-metric.clientWidth}))}))
     };
     const heading=card.querySelector('.rp-quality-columns,.rp-shop-columns');
     return {kind:Number(card.dataset.rpBoard),width:card.clientWidth,overflow:card.scrollWidth-card.clientWidth,headerBottom:card.querySelector('.rhead').getBoundingClientRect().bottom,headed:visible(heading),names:[...heading.children].filter(n=>!n.matches('.rp-loss-product-label')).flatMap(n=>n.textContent.trim()==='进线率/差评率'?['进线率','差评率']:[n.textContent.trim()]),rows:[...card.querySelectorAll('.rp-entry')].map(row=>({id:row.dataset.rpRow,scoreWrapped:!!row.querySelector('.rp-shop-scores')&&row.querySelector('.rp-shop-scores').getBoundingClientRect().top>=row.querySelector('.rp-shop-identity').getBoundingClientRect().bottom-1,scoreXs:[...row.querySelectorAll('.rp-shop-scores:not(.rp-shop-link-counts)>div')].map(n=>n.getBoundingClientRect().x),top:row.getBoundingClientRect().top,bottom:row.getBoundingClientRect().bottom,contentTop:row.querySelector('.rp-entry-main').getBoundingClientRect().top,contentBottom:row.querySelector('.rp-entry-main').getBoundingClientRect().bottom,metrics:[...row.querySelectorAll('.rp-quality-metric,.rp-shop-metric')].map(metric=>{
      const label=metric.querySelector('.rp-quality-mobile-label,.rp-shop-mobile-label'),jointLabel=metric.closest('.rp-quality-rate-pair')?.querySelector('.rp-quality-pair-label'),displayLabel=visible(label)?label:jointLabel||label,value=metric.querySelector(':scope>strong'),valueRect=value.getBoundingClientRect(),contents=getComputedStyle(metric).display==='contents',rect=contents?valueRect:metric.getBoundingClientRect(),right=contents?metric.parentElement.getBoundingClientRect().right:rect.right;
      return {key:metric.dataset.rpField,label:label.textContent.trim(),labeled:visible(displayLabel),labelBottom:displayLabel.getBoundingClientRect().bottom,valueTop:valueRect.top,x:rect.x,y:rect.y,valueRight:valueRect.right,right,overflow:contents?value.scrollWidth-value.clientWidth:metric.scrollWidth-metric.clientWidth,value:value.textContent.trim(),comparison:metric.querySelector('small')?.textContent.trim()};
     })}))};
    });
   });
   assert.equal(cards.length,6);
   const identities=await page.locator('#riskrail .rp-identity b').evaluateAll(nodes=>nodes.map(node=>{const text=node.querySelector(':scope>span:first-child')||node,css=getComputedStyle(text);return {table:!!node.closest('.rp-loss-wide'),shop:!!node.closest('.rp-shop-identity'),size:css.fontSize,weight:css.fontWeight,lineHeight:css.lineHeight}}));
   assert(identities.some(name=>name.shop),'同时核对店铺和产品身份名称');
   assert(identities.length>0&&identities.every(name=>name.size===(name.table?'14px':'16px')&&name.weight===(name.table?'500':'400')),width+'px 卡片产品名/店铺名统一，表格保持正文规格');
   assert(identities.filter(name=>!name.table).every(name=>name.lineHeight==='22px'),width+'px 卡片身份行高统一');
   assert.equal(await page.locator('#riskrail [data-rp-board="0"] .rp-quality-rate-pair').count(),0,'违规榜不再展示进线率/差评率组合指标');
   for(const [index,card] of cards.entries()){
    const context=`${width}px 榜单${index}`;assert.equal(card.headed,card.kind===2,`${context} 仅亏损榜使用表格表头`);assert(card.overflow<=1,`${context} 卡片横向溢出`);
    assert(!card.rows.length||card.rows[0].top>=card.headerBottom-1,`${context} 首条记录与榜单标题重叠`);
    if(card.platformMatrix){assert(card.rows.every(row=>row.metrics.every(metric=>metric.overflow<=1)),context+' 平台指标不溢出');continue;}
    for(const [rowIndex,row] of card.rows.entries()){
     assert(row.contentTop>=row.top-1&&row.contentBottom<=row.bottom+1,`${context} 第${rowIndex+1}条内容超出行高`);
     if(rowIndex)assert(Math.abs(row.top-card.rows[rowIndex-1].top)<1||row.top>=card.rows[rowIndex-1].bottom-1,`${context} 相邻记录重叠`);
     if(row.scoreWrapped&&row.scoreXs.length===4){
      const columns=[...new Set(row.metrics.map(m=>m.x))],scores=columns.length===2?[row.scoreXs[0],row.scoreXs[2]]:row.scoreXs;
      assert(scores.every((x,i)=>Math.abs(x-columns[i])<1),`${context} 店铺评分与经营指标列错位`);
     }
     assert.deepEqual(row.metrics.map(m=>m.label),card.names,`${context} 指标名与表头不一致`);
     for(const metric of row.metrics){
      assert(metric.overflow<=1&&metric.valueRight<=metric.right+1,`${context} ${metric.key} 指标内容溢出`);
      if(!card.headed)assert(metric.labeled&&metric.labelBottom<=metric.valueTop+1,`${context} ${metric.key} 缺少相邻标签`);
     }
     if(card.headed){assert(row.metrics.every(m=>Math.abs(m.y-row.metrics[0].y)<1),`${context} 保留列头时指标不能跨行`);}
    }
   }
   const values=cards.map(c=>c.rows.map(row=>({id:row.id,metrics:row.metrics.map(({key,value,comparison})=>({key,value,comparison}))})));
   if(reference)assert.deepEqual(values,reference,`${width}px 布局切换改变了指标数值`);else reference=values;
  }
 }finally{if(original)await page.setViewportSize(original)}
}
