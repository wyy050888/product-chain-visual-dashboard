import assert from 'node:assert/strict';

export async function verifyNewProductChannelLayout(page){
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});
  for(const end of [false,true]){
   const layout=await page.locator('#newtop .nsp-channels').evaluate((root,end)=>{
    const scroll=root.querySelector('.nsp-channel-scroll');scroll.scrollLeft=end?scroll.scrollWidth:0;
    const groups=[...root.querySelectorAll('svg [data-nsp-channel]')],labels=[...root.querySelectorAll('.nsp-channel-labels button')];
    const names=labels.map(node=>node.querySelector('.nsp-channel-name')?.textContent),textFits=labels.every(node=>node.scrollWidth<=node.clientWidth+1&&node.querySelector('.nsp-channel-name').scrollWidth<=node.querySelector('.nsp-channel-name').clientWidth+1);
    const boxes=labels.map(node=>node.getBoundingClientRect()),svg=root.querySelector('svg'),matrix=svg.getScreenCTM();
    const heading=root.querySelector('h3').getBoundingClientRect(),values=groups.map(g=>g.querySelector('text').getBoundingClientRect()),highest=Math.min(...values.map(b=>b.top));
    return {names,textFits,hasPositive:groups.some(g=>Number.parseFloat(g.querySelector('text').textContent.replaceAll(',',''))>0),titleGap:highest-heading.bottom,labelsNotClipped:values.every(b=>b.top>=svg.getBoundingClientRect().top-1),count:labels.length,aligned:groups.every((group,i)=>{const text=group.querySelector('text'),center=new DOMPoint(+text.getAttribute('x'),0).matrixTransform(matrix).x;return Math.abs(center-(boxes[i].left+boxes[i].width/2))<1}),
     axisGap:groups.length?boxes[0].top-(new DOMPoint(0,svg.viewBox.baseVal.height-8).matrixTransform(matrix).y):0,
     singleRow:boxes.every(box=>Math.abs(box.top-boxes[0].top)<1),pageOverflow:document.querySelector('.page').scrollWidth>document.querySelector('.page').clientWidth+1,
     bounded:scroll.clientWidth<=root.clientWidth,canScroll:scroll.scrollWidth>scroll.clientWidth,scrollLeft:scroll.scrollLeft};
   },end);
   assert.equal(layout.count,6);assert.deepEqual(layout.names,['抖音','快手','视频号','天猫','京东','拼多多']);assert(layout.textFits,'平台名称完整且不溢出 '+width);if(layout.hasPositive)assert(layout.titleGap>=4&&layout.titleGap<=26,'标题到最高数值紧凑：'+JSON.stringify({width,...layout}));assert(layout.labelsNotClipped,'图中数值不裁切 '+width);assert(layout.axisGap>=8&&layout.axisGap<=24,'柱形基线与横坐标间距紧凑：'+JSON.stringify({width,...layout}));assert(layout.aligned&&layout.singleRow,'数值和横轴中心一致且单行：'+JSON.stringify({width,end,...layout}));
   assert(!layout.pageOverflow&&layout.bounded,'横向滚动只在图表内：'+width);assert(!layout.canScroll,'六平台在可用宽度内完整展示');
   assert.equal(layout.scrollLeft,0);
  }
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('.nsp-channel-scroll').evaluate(node=>node.scrollLeft=0);
}
