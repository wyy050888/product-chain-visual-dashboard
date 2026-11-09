// 演示目标按SPU×渠道独立配置；已收退目标不由总退目标按比例推算。
const qrbReturnTargetProfiles=[[5,3],[6,4.5],[7,5],[8,6.5],[9,6],[10,7.5],[12,8],[15,10]];
const qrbReturnTargetSamples=new Map(sampleSpus.flatMap(product=>filterCatalog.platforms.map((channel,index)=>{
 const [returnTarget,receivedTarget]=qrbReturnTargetProfiles[(product.sourceRow*7+index*3)%qrbReturnTargetProfiles.length];
 return [product.spuId+'|'+channel,Object.freeze({returnTarget,receivedTarget})];
})));
function qrbReturnTargets(product,channel){
 const key=(product.spuId||product.model)+'|'+channel,saved=qrbTargets[key],sample=qrbReturnTargetSamples.get(key)||{};
 // 兼容旧版只保存总退目标的数值；新记录同时保存两项目标。
 const configured=typeof saved==='number'?{returnTarget:saved}:saved&&typeof saved==='object'?saved:{};
 const read=field=>{const value=Object.hasOwn(configured,field)?configured[field]:sample[field];return Number.isFinite(value)&&value>=0&&value<=100?value:null};
 return {returnTarget:read('returnTarget'),receivedTarget:read('receivedTarget')};
}
