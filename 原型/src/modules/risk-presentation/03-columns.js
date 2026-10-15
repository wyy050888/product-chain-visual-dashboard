// 各榜单固定字段与卡片共用模型，库存分组使用对应汇总表头。
const rpExtraKeys={0:['returnTarget','receivedTarget','sales','returned','receivedUnits','contacts','previousReturn','previousReceived','previousContact','returnGrowth','receivedGrowth','contactGrowth','returnGap','receivedGap'],
  1:['core','worsening'],2:['profit','returned','receivedUnits','refund'],3:['warehouse','factory','undelivered','price','staleUnits','staleValue'],
  4:['warehouse','factory','undelivered','price','turn','age'],6:['returnTarget','receivedTarget','sales','returned','receivedUnits','returnGap','receivedGap','contact','down','fineCount','fineAmount','previousReturn','previousReceived']};
const rpListState={filters:{},sorts:{},period:null,trends:{}};
// 库存抽屉不继承首页季品筛选；临时读取全量，立即还原首页状态。
function rpListRows(k){const platform=[3,4].includes(k)?'all':k===0?qrState.listPlatform:(rfState.listPlatforms[k]||rpCardPlatformState.value);if(![3,4].includes(k))return rpRowsForPlatform(k,platform);const previous=riskSeasonState[k];riskSeasonState[k]='all';try{return rpRowsForPlatform(k,platform)}finally{riskSeasonState[k]=previous}}
function rpColumnKeys(k){if(k===6)return [...rpReturnListKeys];if(k===3||k===4)return [...rpStockListKeys[k]];if(k===2)return [...rpLossListKeys];if(k===1)return [...rpShopListKeys];if(k===0)return [...rpQualityListKeys];let keys=[...rpCardKeys[k].filter(key=>!['causes','attribute'].includes(key)),...rpExtraKeys[k]];if(k===0||k===6)keys=keys.filter(key=>!['returnTarget','receivedTarget','returnGap','receivedGap'].includes(key));if(k===1){const platform=rfState.listPlatforms[1];if(platform==='all'||['抖音','天猫'].includes(platform))keys.push('productScore','logisticsScore','serviceScore');if(platform==='all'||platform==='拼多多')keys.push('third0','third1','third2','main0','main1','main2','pddHit')}return [...new Set(keys)]}
function rpColumnName(key,rows,k){const known=rows.length?rpFieldMap(k,rows[0]).find(f=>f.key===key):null;const fallback={third0:'三级类目 · 品质退款率',third1:'三级类目 · 品质求助平台率',third2:'三级类目 · 品质文本情感分',main0:'主营类目 · 品质退款率',main1:'主营类目 · 品质求助平台率',main2:'主营类目 · 品质文本情感分',pddHit:'异常链接',productScore:'商品分',logisticsScore:'物流分',serviceScore:'服务分'};return known?.name||fallback[key]||({season:'季品',productType:'属性',mainSpu:'核心主营SPU',score:'店铺分',problemSpus:'店铺内问题SPU数',limited:'店铺限单',offShelf:'链接下架',drop:'链接掉权',gsv:'GSV',sales:'销量',netSales:'去退后销量',violations:'违规次数',fine:'平台罚款',frozen:'资金冻结'})[key]||key}
function rpRiskCell(k,r){const causes=rpCauses(k,r);return `<div class="rp-list-risks"><span>${esc([![1,3,4].includes(k)&&r.level?'优先级 '+r.level:'',...causes].filter(Boolean).join('；')||'—')}</span></div>`}
// 辅助指标标签用普通辅助文字颜色，后面的数值保留字段颜色。
function rpTargetText(f){
 const text=String(f.target||'—'),label=f.targetTone&&text.match(/^(环比|偏差|亏损率|呆滞占比|呆滞金额占比|库存|可售天数) /)?.[1];
 return label?'<span class="rp-comparison-label">'+esc(label)+'</span> <span class="rp-comparison-value">'+esc(text.slice(label.length+1))+'</span>':esc(text);
}
function rpProductTagMarkup(tags){
 return tags?.length?'<div class="rp-product-tags">'+tags.map(t=>'<span class="rp-product-tag rp-product-tag--'+esc(t.kind)+'">'+(t.kind==='new'?'<span class="rp-product-tag-spark" aria-hidden="true">✦</span>':'')+esc(t.label)+'</span>').join('')+'</div>':'<span class="muted">—</span>';
}
function rpListCell(f,showHint=true){if(f?.key==='productType')return rpProductTagMarkup(f.tags);if(f?.key==='mainSpu')return rpShopSpuMarkup(f.product);return f?`<div class="rp-list-value"><strong class="rp-value ${f.tone}" ${showHint&&f.hint?`title="${esc(f.hint)}"`:''}>${esc(f.value)}</strong>${f.target?'<em class="'+esc(f.targetTone||'')+'">'+rpTargetText(f)+'</em>':''}</div>`:'<span class="muted">不适用</span>'}
function rpGroups(rows,dimension,k){return irGroups(rows,dimension).map(g=>({...g,staleUnits:g.rows.reduce((n,r)=>n+upStockFacts(r).staleUnits,0),staleValueCents:g.rows.reduce((n,r)=>n+upStockFacts(r).staleValueCents,0)})).sort((a,b)=>k===4?b.staleValueCents-a.staleValueCents:b.goodsValueCents-a.goodsValueCents)}
function rpGroupHeaders(k,dimension){return['序号',dimension==='chain'?'产品链':'品牌',k===3?'高危SPU数':'滞销SPU数','仓内库存','工厂库存','新机未交付','总库存',k===3?'高危品货值':'滞销金额','超库龄库存数','操作']}
function rpGroupValues(k,g,i){return[i+1,esc(g.name),g.count,rpCount(g.warehouse),rpCount(g.factory),rpCount(g.undelivered),rpCount(g.totalUnits),upMoney(k===3?g.goodsValueCents:g.staleValueCents),rpCount(g.staleUnits),`<button class="link" data-rp-group="${esc(String(g.key))}">查看明细</button>`]}

function rpWithListPeriod(run){return drawerWithPeriod(rpListState.period||periodFor('risk'),run)}
