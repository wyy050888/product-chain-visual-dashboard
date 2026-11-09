// 月度基准按矩阵既有周期口径换算；同一周期不随筛选结果重新分位。
const kpmBubbleBands=Object.freeze([
 {max:50e6,radius:5},
 {max:300e6,radius:7},
 {max:1000e6,radius:9},
 {max:Infinity,radius:11}
].map(Object.freeze));
function kpmBubbleTier(gsvCents,mode=periodFor('matrix').mode){const factor=brcGradeFactor(mode);return kpmBubbleBands.findIndex(band=>gsvCents<band.max*factor)}
function kpmBubbleRadius(tier,zoom=false){return kpmBubbleBands[tier].radius*(zoom?1.2:1)}
