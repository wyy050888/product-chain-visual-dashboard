// 本地品牌风格店铺示意头像；不是平台官方店招，正式头像字段优先。
const shopAvatarAssets={康佳:'assets/shop-avatars/konka.svg',创维:'assets/shop-avatars/skyworth.svg',苏泊尔:'assets/shop-avatars/supor.svg',海尔:'assets/shop-avatars/haier.svg'};
function shopAvatarSource(name){
 const shop=[...sampleShops,...sampleDemoShops].find(row=>row.name===name);
 return shop?.avatar||shopAvatarAssets[shop?.brand]||'assets/shop-avatars/default.svg';
}
