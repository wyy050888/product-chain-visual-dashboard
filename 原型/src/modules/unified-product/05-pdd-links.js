// 仅用稳定SPU关联；不以名称、型号或品牌推测核心链接归属。
function upPddProductLinks(product,end){
 const rows=[];
 for(const shop of klcShops()){
  for(const link of sbPddLinks(shop,end)){
   const spuId=link.spuId||klcLookup(String(shop.shopId),link.id)?.spuId;
   if(spuId!==product.spuId||!['red','yellow'].includes(link.assessment))continue;
   rows.push({...link,shopId:String(shop.shopId),shopName:shop.name});
  }
 }
 return rows;
}
// 拼多多独立考核不受当前退货平台及处罚事件筛选影响，截止日随详情切换。
function upPddLinkViolationView(product,end){
 const rows=upPddProductLinks(product,end);if(!rows.length)return '';
 const groups=['red','yellow'].map(tone=>{
  const links=rows.filter(link=>link.assessment===tone);if(!links.length)return '';
  return `<section class="up-pdd-links" data-up-pdd-tone="${tone}">${rpPddLinksTableMarkup(links,tone==='red'?'红灯链接明细':'黄灯链接明细',end,true)}</section>`;
 }).join('');
 return `<section class="up-quality-region up-pdd-violations" aria-label="拼多多核心链接违规"><h3>拼多多核心链接违规</h3>${groups}</section>`;
}
