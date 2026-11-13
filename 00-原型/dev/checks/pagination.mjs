import {openNewProductSpu} from './new-products-detail.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

async function verifyPager(page,navSelector,rowSelector){
 const nav=page.locator(navSelector+' .list-pagination'),select=nav.getByRole('combobox',{name:'每页条数'});
 await nav.waitFor();assert.deepEqual(await select.locator('option').allTextContents(),['10条/页','20条/页','50条/页']);
 for(const size of [10,20,50]){
  await select.selectOption(String(size));
  await page.waitForFunction(({selector,size})=>document.querySelector(selector+' .list-pagination')?.dataset.listSize===String(size),{selector:navSelector,size});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  const total=Number(await nav.getAttribute('data-list-total')),pages=Math.max(1,Math.ceil(total/size));
  assert.equal(await nav.getAttribute('data-list-current'),'1',navSelector+' 切换回第一页');
  assert.equal(await nav.getAttribute('data-list-pages'),String(pages));
  if(total)assert.equal(await page.locator(rowSelector+':not(.drawer-list-hidden)').count(),Math.min(total,size),navSelector+' 实际行数');
  if(pages>1){
   await nav.getByRole('spinbutton',{name:'跳转页码'}).fill(String(pages));
   await nav.getByRole('spinbutton',{name:'跳转页码'}).press('Enter');
   assert.equal(await nav.getAttribute('data-list-current'),String(pages));
   assert.equal(await page.locator(rowSelector+':not(.drawer-list-hidden)').count(),total-(pages-1)*size,navSelector+' 最后一页');
  }
 }
}
async function sharedContracts(page){
 const fixture=await page.context().newPage();
 try{
  await fixture.setContent('<div id="overlay"><div id="dialog" class="drawer"><div id="dialogbody"></div></div></div>');
  await fixture.addScriptTag({content:"const $=s=>document.querySelector(s),fmt=n=>String(n),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('\"','&quot;');"});
  for(const file of ['00-size','01','02-drawer-tables'])await fixture.addScriptTag({content:fs.readFileSync(new URL('../../src/modules/list-pagination/'+file+'.js',import.meta.url),'utf8')});
  await fixture.evaluate(()=>{
   const body=document.querySelector('#dialogbody');
   body.innerHTML='<section id="direct"><div id="direct-table"></div><div id="direct-pages"></div></section><section id="delegated"></section><section id="generic"><table><tbody>'+Array.from({length:63},(_,i)=>'<tr><td>'+i+'</td></tr>').join('')+'</tbody></table></section>';
   window.renderDirect=(page=1)=>{
    const size=listPageSize('direct-pages'),start=(page-1)*size;
    document.querySelector('#direct-table').innerHTML='<table><tbody>'+Array.from({length:Math.min(size,63-start)},(_,i)=>'<tr><td>'+(start+i)+'</td></tr>').join('')+'</tbody></table>';
    mountListPager(document.querySelector('#direct-pages'),63,page,next=>renderDirect(next));
   };
   window.renderDelegated=(page=1)=>{
    const size=listPageSize('delegated',10),start=(page-1)*size;
    document.querySelector('#delegated').innerHTML='<table><tbody>'+Array.from({length:Math.min(size,63-start)},(_,i)=>'<tr><td>'+(start+i)+'</td></tr>').join('')+'</tbody></table>'+listPager(63,page,size,{sizeKey:'delegated',attr:'data-contract',value:'fixed',delta:'data-delta',extra:{'data-kind':'page'}});
   };
   document.querySelector('#delegated').onclick=e=>{const b=e.target.closest('[data-contract]');if(b&&!b.disabled){if(b.dataset.contract!=='fixed'||b.dataset.kind!=='page')throw Error('分页委托属性丢失');renderDelegated(Number(document.querySelector('#delegated nav').dataset.listCurrent)+Number(b.dataset.delta))}};
   renderDirect();renderDelegated();paginateDrawerTables();
  });
  await verifyPager(fixture,'#direct-pages','#direct-table tbody tr');
  assert.equal(await fixture.locator('#direct .drawer-table-pagination').count(),0,'业务 50 条不能二次分页');
  await verifyPager(fixture,'#delegated','#delegated tbody tr');
  await verifyPager(fixture,'#generic .drawer-table-pagination','#generic tbody tr');
  assert.equal(await fixture.locator('#direct-pages select').inputValue(),'50','各列表独立保留页长');
 }finally{await fixture.close()}
}
export async function paginationDepartments(page){
 const base=page.url();let checked=0;
 for(const name of ['产品中心','项目部','研发中心','采购部']){
  await page.goto(new URL(name+'.html',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  const keys=await page.locator('.list-pagination:visible').evaluateAll(nodes=>nodes.map(nav=>nav.dataset.listSizeKey));
  assert(keys.length>0,name+' 存在分页列表');
  for(const key of new Set(keys)){
   assert(key,name+' 分页已接入页长状态');
   const nav=page.locator('nav.list-pagination[data-list-size-key="'+key+'"]:visible').first();
   for(const size of [10,20,50]){
    await nav.locator('select.list-page-size').selectOption(String(size));
    assert.equal(await nav.getAttribute('data-list-size'),String(size),name+' '+key);
    assert.equal(await nav.getAttribute('data-list-current'),'1',name+' '+key+' 回第一页');
    if(/newcount|matrix-product-pager|pp-projects$|gd-pager/.test(key)){
     const data=await nav.evaluate(nav=>{const table=[...document.querySelectorAll('table')].findLast(table=>table.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_FOLLOWING);return {total:Number(nav.dataset.listTotal),rows:table?.tBodies[0]?.rows.length||0}});
     if(data.total)assert.equal(data.rows,Math.min(data.total,size),name+' '+key+' 实际取数');
    }
    const next=nav.getByRole('button',{name:'下一页',exact:true});
    if(await next.isEnabled()){await next.click();assert.equal(await nav.getAttribute('data-list-current'),'2',name+' '+key+' 翻页仍可用')}
   }
   checked++;
  }
 }
 console.log('部门分页检查：'+checked+' 个列表');
}
export async function paginationShops(page){
 const base=new URL('数智罗盘/店铺配置.html',page.url()).href;
 for(const platform of ['douyin','kuaishou','wechat','tmall','jd','pdd']){
  await page.goto(base+'?platform='+platform,{waitUntil:'domcontentloaded'});
  const select=page.locator('#page-size');await select.waitFor();
  assert.deepEqual(await select.locator('option').allTextContents(),['10条/页','20条/页','50条/页']);
  const count=(await page.evaluate(()=>shopAdminAudit())).shops.length;
  for(const size of [10,20,50]){
   await select.selectOption(String(size));
   assert.equal(await page.locator('#shop-rows tr').count(),Math.min(size,count));
   assert.equal(await page.locator('#page-jump').inputValue(),'1');
  }
  if(['douyin','kuaishou','wechat'].includes(platform)){
   await page.locator('#records-open').click();await page.locator('#records-overlay').waitFor({state:'visible'});
   assert.deepEqual(await page.locator('#record-page-size option').allTextContents(),['10条/页','20条/页','50条/页']);
   for(const size of [10,20,50]){await page.locator('#record-page-size').selectOption(String(size));assert.equal(await page.locator('#record-page-jump').inputValue(),'1')}
  }
 }
}
export async function pagination(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#new"]').click();
 await verifyPager(page,'#newcount','#newtable tbody tr');
 await page.getByRole('button',{name:'查看季度考核',exact:true}).click();
 await verifyPager(page,'[data-nsp-assessment-pages]','[data-nsp-assessment-table] tbody tr');
 const before=await page.locator('[data-nsp-assessment-pages] .list-pagination').getAttribute('data-list-current');
 await openNewProductSpu(page.locator('[data-nsp-assess-product]').first());await page.locator('.up-detail').waitFor();await page.locator('#close').click();
 assert.equal(await page.locator('[data-nsp-assessment-pages] select.list-page-size').inputValue(),'50');
 assert.equal(await page.locator('[data-nsp-assessment-pages] .list-pagination').getAttribute('data-list-current'),before);
 await page.locator('#close').click();
 assert.equal(await page.locator('#newcount select.list-page-size').inputValue(),'50','抽屉不覆盖主表页长');
 await page.locator('a[href="#projects"]').click();
 await verifyPager(page,'#pp-pages','#pp-table-scroll tbody tr');
 await verifyPager(page,'#pp-analysis-pages','#pp-analysis-ledger-results tbody tr');
 await page.locator('a[href="#matrix"]').click();await verifyPager(page,'#matrix-product-pager','#matrixtable tbody tr');
 await page.locator('a[href="#ai"]').click();await verifyPager(page,'#gd-pager','#ai-inline-details tbody tr');
 await page.locator('a[href="#risk"]').click();
 for(const kind of [0,1,2,3,4,6]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').click();
  await verifyPager(page,'#rp-list-pagination','.rp-list-table tbody tr');
  assert.equal(await page.locator('.rp-list-table .drawer-table-pagination').count(),0);await page.locator('#close').click();
 }
 await page.locator('#lt-system-nav').click();
 for(const [route,nav,rows] of [
  ['#system-core-links','#klc-pagination','#klc-body tr'],
  ['#system-cost-efficiency','#cec-pagination','#cec-body tr'],
  ['#system-strategic-suppliers','#ssi-pagination','#ssi-body tr']
 ]){
  await page.locator('[data-system-route="'+route+'"]').click();await verifyPager(page,nav,rows);
 }
 await page.evaluate(()=>{location.hash='#new'});await page.locator('#new').waitFor({state:'visible'});
 for(const width of [1920,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#newcount .list-pagination').evaluate(nav=>nav.scrollWidth<=nav.clientWidth+1),'分页器窄屏不溢出 '+width);
  assert(await page.locator('#newcount select.list-page-size').isVisible());
  if([1920,390].includes(width)){
   const folder=new URL('../../../outputs/pagination/',import.meta.url);fs.mkdirSync(folder,{recursive:true});
   await page.locator('#newcount .list-pagination').screenshot({path:fileURLToPath(new URL('pager-'+width+'.png',folder))});
  }
 }
 await sharedContracts(page);
}
