// 固定成交单价演示值（分），补足低价产品样例；统一台账据此计算成交及退款金额。
// 这些是原型成交价样例，产品身份与指导价仍各自使用原数据。
const upPriceSampleCents=Object.freeze({
 'SPU-SOURCE-039':7900,  // 创维电动牙刷
 'SPU-SOURCE-038':15900, // 康佳台扇
 'SPU-SOURCE-029':19900, // 康佳剃须刀
 'SPU-SOURCE-036':25900  // 康佳车载吸尘器
});
function upSamplePriceCents(p){
 return upPriceSampleCents[p.spuId]??([899,369,459,299][p.chain]+p.sourceRow%5*30)*100;
}
