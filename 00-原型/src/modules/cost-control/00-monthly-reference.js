// 2026-10-19用户截图：金额单位万元；仅读取可见月值，不用截图四舍五入后的合计反推精度。
// 截图只有部门合计，指标拆分为交互样例；未提供的研发/产品部门沿用原样例。
const ccMonthlyReference={
 purchase:{target:[27,8,335.3,472.6,259.3,383.7,257,137,197,297,447,260],actual:[27.4,9.2,337.6,473,259.2,383.6,260.3]},
 user:{target:[10,30,50,60,30,50,15,30,45,45,45,50],actual:[7.3,34.4,76.5,99.1,30.1,80,17.6]},
 quality:{target:Array(12).fill(25),actual:[17.2,1,17.9,13,1.7,2.8,64.2]},
 risk:{target:[15,15,30,25,25,30,30,30,40,30,15,15],actual:[16.6,2.9,17.6,78.9,137.5,77.8,7.3]},
 planning:{target:[4,3,3,4,4,4,3,3,3,3,3,3],actual:[4.2,.8,1.1,3.7,4.2,4,2.4]},
 shipping:{target:[9,10,5,34,34,64,0,10,30,-5,13,13],actual:[1.1,1,5.6,10.2,36.2,64.3,12.1]},
 warehouse:{target:[10,0,10,26,16,16,20,10,10,15,10,10],actual:[18.6,1,33.2,19.4,9.2,9.1,8]}
};
for(const [department,reference] of Object.entries(ccMonthlyReference)){
 const items=ccItems.filter(item=>item.department===department),weights=items.map(item=>item.annualCents);
 for(let m=1;m<=12;m++){
  const target=ccAllocate(Math.round(reference.target[m-1]*1000000),weights);
  const actual=m<=reference.actual.length?ccAllocate(Math.round(reference.actual[m-1]*1000000),weights):null;
  items.forEach((item,index)=>{const row=ccLedger.find(r=>r.itemId===item.id&&r.month==='2026-'+String(m).padStart(2,'0'));row.targetCents=target[index];row.confirmations=actual?[{id:'REF-2026-'+m+'-'+item.id,date:row.month+'-28',cents:actual[index]}]:[];row.actualMissing=actual===null});
 }
}
