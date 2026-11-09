// 商品身份与考核样例分开保存；未匹配的手工链接不补造指标。
function klcShops(){return sampleShopRows().filter(s=>s.channel==='拼多多')}
const klcCatalog=klcShops().flatMap(shop=>Array.from({length:20},(_,i)=>{
 const product=names[shop.chain][i%names[shop.chain].length],spu=sampleSpuByName(product),seed=shop.id+i;
 const values=[[38,34,28],[12,18,24],[31,22,18],[46,42,39],[30,30,30]][seed%5];
 const redCount=values.filter(v=>v>30).length*2,rank=sbPddRankSample(redCount,seed);
 return {shopId:String(shop.shopId),linkId:String(730000000000+shop.id*1000+i+1),name:product+(i>=6?' · '+(Math.floor(i/6)+1)+'号链接':''),spuId:spu?.spuId||'',product,model:spu?.model||'—',thirdCategory:product,mainCategory:chains[shop.chain],metrics:['近30天品质退款率','近30天品质求助平台率','近30天品质文本情感分'].map((name,j)=>({name,value:fmt(values[j],1)+'%',thirdValue:values[j],mainValue:values[j],thirdRed:values[j]>30,mainRed:values[j]>30,thirdRank:rank.third[j],mainRank:rank.main[j]}))};
}));
