import assert from 'node:assert/strict';
export async function verifyTargetHeader(page,id,title,tabs){
 const root=page.locator(id),head=root.locator('.sm-target-head'),heading=head.getByRole('heading',{name:title,exact:true});
 assert(await heading.isVisible());assert.deepEqual(await head.getByRole('tab').allTextContents(),tabs);
 assert.equal(await root.locator('.lt-panel [role=tablist]').count(),0);
 const style=await heading.evaluate(e=>({color:getComputedStyle(e).color,border:getComputedStyle(e).borderBottomWidth}));assert.equal(style.color,'rgb(31, 35, 41)');assert.equal(style.border,'0px');
 if(tabs.length){const a=await heading.boundingBox(),b=await head.locator('[role=tablist]').boundingBox();assert(b.x>a.x+a.width,'Tab在标题后');assert(Math.abs((a.y+a.height/2)-(b.y+b.height/2))<3,'标题和Tab在同一行')}
 const year=root.locator('.lt-year-field');if(await year.count()){assert.equal(await head.locator('.lt-year-field').count(),1);const y=await year.boundingBox(),h=await head.boundingBox();assert(Math.abs(y.y+y.height/2-h.y-h.height/2)<3,'年度在标题栏内');assert(h.x+h.width-y.x-y.width<30,'年度靠标题栏右侧');assert.equal(await root.locator('.lt-toolbar').count(),0)}
 const viewport=page.viewportSize();await page.setViewportSize({width:390,height:900});assert(await heading.isVisible());if(tabs.length)assert(await head.getByRole('tab').first().isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.setViewportSize(viewport);
}
