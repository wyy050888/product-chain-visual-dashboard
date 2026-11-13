// 比率以百分数存储。上期为负时取绝对值，环比符号与实际升降一致。
function periodRateGrowth(current,previous){
 if(!Number.isFinite(current)||!Number.isFinite(previous)||previous===0)return null;
 return (current-previous)/Math.abs(previous)*100;
}

function periodRateGrowthText(growth,missing='—'){
 if(!Number.isFinite(growth))return missing;
 const magnitude=Math.round(Math.abs(growth)*10)/10;
 return magnitude===0?'持平':(growth>0?'↑ ':'↓ ')+fmt(magnitude,1)+'%';
}
