// 样例经营指标与SPU身份分离；每个产品视图按SPU唯一ID生成一条记录。
function sampleProductRows(isNew){
  return sampleSpus.filter(p=>!isNew||p.cohort==='new').map((p,i)=>{
    const mode=i%5,sale=isNew?26+i*6.4:mode===0?128-i:mode===1?96-i/2:mode===2?18-i/10:mode===3?12-i/10:35+i/2;
    const profit=isNew?8+i%12:mode===0?14.3+i%3:mode===1?7.2+i%2:mode===2?18+i%3:mode===3?6+i%3:11+i%4;
    const days=isNew?22+i%24*4:142+i*9,elapsed=Math.max(0,(Date.parse(bounds().cutoff)-Date.parse(bounds().start))/86400000+1);
    return {id:10000+p.sourceRow,...sampleSpuFields(p),channel:channels[i%channels.length],
      sales:Math.round(sale*snapshotFactor()*(isNew?Math.min(days,elapsed)/75:1)*10)/10,
      profit,returnRate:3.2+i%8*.55,days,grade:['A','B','A','C','D'][i%5],state:i%7===0?'整改':'在售'};
  });
}
function sampleQualityCatalog(){return sampleSpus.map((p,i)=>{
  const metric=+(Math.max(3,18.2-i*.2)*snapshotFactor()).toFixed(1);
  return {id:10000+p.sourceRow,...sampleSpuFields(p),channel:channels[i%channels.length],owner:people[i%people.length],
    metric,value:metric+'%',desc:i===0?'平台处罚 · 一票置顶':'高退货 / 差评'};
})}
