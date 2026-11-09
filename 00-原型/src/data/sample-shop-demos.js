// 新增店铺均为演示身份；与原截图店铺分开维护，复用经营、风险和详情台账。
const sampleDemoShops=(()=>{
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'],brands=['康佳','创维','苏泊尔'];
 const scores={抖音:[4.42,4.65,4.35,4.68],快手:[4.25,4.48,4.35,4.52],视频号:[4.0,4.25,4.35,4.15],天猫:[4.45,4.55,4.65,4.35],京东:[4.35,4.55,4.65,4.45],拼多多:[4.4,4.6,4.3,4.5]};
 return Array.from({length:24},(_,index)=>{
  const group=Math.floor(index/6),platformIndex=index%6,channel=platforms[platformIndex],brand=brands[(group+platformIndex)%brands.length];
  const chain=(group+platformIndex)%(brand==='苏泊尔'?2:3),category=['清洁电器','生活电器','环境电器'][chain];
  return {name:brand+category+channel+'演示'+(group+1)+'号旗舰店',shopId:'DEMO-SHOP-'+String(index+1).padStart(3,'0'),
   brand,chain,channel,source:'demo',referenceGsv:85+group*95+platformIndex*17,referenceUnits:1800+index*215,
   referenceMargin:14+index%7*2.3,referenceReturn:8+index%6*2.1,referenceScore:scores[channel][group],
   productScore:+(4.1+(index%6)*.13).toFixed(2),logisticsScore:+(4.15+(index%5)*.14).toFixed(2),serviceScore:+(4.05+(index%7)*.12).toFixed(2)};
 });
})();
