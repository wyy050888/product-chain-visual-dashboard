// SPU图片与项目图片独立；SPU缺图时不拿相似项目图片替代。
function riskThumbnail(name,isShop=false){
  if(isShop)return '<span class="risk-thumb risk-shop-icon" aria-label="店铺">店</span>';
  const spu=sampleSpuByName(name),src=spu?spu.image:productImages[name];
  return src?`<img class="risk-thumb" src="${src}" alt="${esc(name)}" loading="lazy" width="38" height="38">`:'<span class="risk-thumb risk-shop-icon" aria-label="产品暂无图片">品</span>';
}
