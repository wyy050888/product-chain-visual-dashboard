// 所有经营金额入口复用元/万元阈值；零与缺失分开。
function pfMoneyYuan(value,signed=false){
 if(!Number.isFinite(value))return '--';
 return (signed&&value>0?'+':'')+fmt(Math.abs(value)>10000?value/10000:value,1).replaceAll(',','')+(Math.abs(value)>10000?'w':'元');
}
upMoney=function(cents,signed=false){return Number.isFinite(cents)?pfMoneyYuan(cents/100,signed):'--'};
upPercent=function(value){return Number.isFinite(value)?fmt(value,1)+'%':'--'};

