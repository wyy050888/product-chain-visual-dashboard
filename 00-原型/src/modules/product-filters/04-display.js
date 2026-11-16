// 所有经营金额入口复用元/万元阈值；零与缺失分开。
function usesTenThousandYuan(yuan){return Math.abs(yuan)>10000}
function pfMoneyYuan(value,signed=false,digits=1){
 if(!Number.isFinite(value))return '--';
 const inWan=usesTenThousandYuan(value);
 return (signed&&value>0?'+':'')+fmt(inWan?value/10000:value,digits).replaceAll(',','')+(inWan?'w':'元');
}
function yuanAmountParts(cents,grouped=false){
 if(!Number.isFinite(cents))return ['—',''];
 const yuan=cents/100,inWan=usesTenThousandYuan(yuan);
 const amount=fmt(inWan?yuan/10000:yuan,2);
 return [grouped?amount:amount.replaceAll(',',''),inWan?'万元':'元'];
}
function formatStockValue(cents,grouped=false){return yuanAmountParts(cents,grouped).join('')}
upMoney=function(cents,signed=false){return Number.isFinite(cents)?pfMoneyYuan(cents/100,signed):'--'};
upPercent=function(value){return Number.isFinite(value)?fmt(value,1)+'%':'--'};

