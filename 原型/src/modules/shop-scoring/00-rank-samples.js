// 照片1的同行排序列样例；仅用于展示，不将排名百分位当作商品指标原值。
// 每组三项依次为品质退款率、品质求助平台率、品质文本情感分。
const sbPddRankSamples={
 red:[
  {third:['已超越30%同行','已超越50%同行','已超越50%同行'],main:['处于同行后30%','处于同行后30%','处于同行后30%']},
  {third:['处于同行后30%','已超越10%同行','处于同行后30%'],main:['处于同行后10%','处于同行后30%','处于同行后30%']}
 ],
 yellow:{third:['已超越50%同行','处于同行后30%','已超越90%同行'],main:['已超越50%同行','处于同行后10%','已超越90%同行']},
 none:{third:['--','--','--'],main:['--','--','--']}
};
function sbPddRankSample(redCount,seed){
 return redCount>=3?sbPddRankSamples.red[Math.abs(seed)%sbPddRankSamples.red.length]:redCount>0?sbPddRankSamples.yellow:sbPddRankSamples.none;
}
