// 各榜单固定字段与卡片共用模型，库存分组使用对应汇总表头。
const rpExtraKeys={0:['returnTarget','sales','returned','receivedUnits','contacts','previousReturn','previousReceived','previousContact','returnGrowth','receivedGrowth','contactGrowth','returnGap'],
  1:['core','worsening'],2:['profit','returned','receivedUnits','refund'],3:['warehouse','factory','undelivered','price','staleUnits','staleValue'],
  4:['warehouse','factory','undelivered','price','turn','age'],6:['returnTarget','sales','returned','receivedUnits','returnGap','contact','down','fineCount','fineAmount','previousReturn','previousReceived']};
const rpListState={filters:{},sorts:{},period:null,periods:{},kind:null};
// 库存抽屉不继承首页季品筛选；临时读取全量，立即还原首页状态。
function rpListRows(k){const platform=[3,4].includes(k)?'all':k===0?qrState.listPlatform:(rfState.listPlatforms[k]||rpCardPlatform(k));if(k===0){const range=qrWindow();return qfViolationPlatformRows(platform,range.start,range.end)}if(![3,4].includes(k))return rpRowsForPlatform(k,platform);const previous=riskSeasonState[k];riskSeasonState[k]='all';try{return rpRowsForPlatform(k,platform)}finally{riskSeasonState[k]=previous}}
// 季品、类目保留筛选；销量仅展示去退后的netSales，原始sales保留供业务计算。
function rpProductColumnKeys(keys){return keys.filter(key=>!['category','season','sales'].includes(key))}
// 多平台对照固定保留掉权列；单行是否适用仍按所属平台判断。
function rpQualityColumnKeys(platform){
 const multiple=Array.isArray(platform)&&new Set(platform.filter(value=>value&&value!=='all')).size>1;
 return rpProductColumnKeys(rpQualityListKeys.filter(key=>key==='drop'&&multiple||rpViolationMetricAllowed(key,platform)));
}
function rpColumnKeys(k){if(k===8)return rpDeviationListKeys;if(k===6)return rpProductColumnKeys(rpReturnListKeys);if(k===3||k===4)return rpProductColumnKeys(rpStockListKeys[k]);if(k===2)return rpProductColumnKeys(rpLossListKeys);if(k===1)return rpShopColumns(rfState.listPlatforms[1]||rpCardPlatformState.value);if(k===0)return rpQualityColumnKeys(qrState.listPlatform);let keys=[...rpCardKeys[k].filter(key=>!['causes','attribute'].includes(key)),...rpExtraKeys[k]];if(k===0||k===6)keys=keys.filter(key=>!['returnTarget','returnGap'].includes(key));if(k===1){const platform=rfState.listPlatforms[1];if(platform==='all'||['抖音','天猫'].includes(platform))keys.push('productScore','logisticsScore','serviceScore');if(platform==='all'||platform==='拼多多')keys.push('third0','third1','third2','main0','main1','main2','pddHit')}return [...new Set(keys)]}
function rpColumnName(key,rows,k){const known=rows.length?rpFieldMap(k,rows[0]).find(f=>f.key===key):null;const fallback={third0:'三级分类 · 品质退款率',third1:'三级分类 · 品质求助平台率',third2:'三级分类 · 品质文本情感分',main0:'主营链群 · 品质退款率',main1:'主营链群 · 品质求助平台率',main2:'主营链群 · 品质文本情感分',pddHit:'异常链接',productScore:'商品分',logisticsScore:'物流分',serviceScore:'服务分'};return known?.name||fallback[key]||({returnGrowth:'总退环比',receivedGrowth:'已收退环比',category:'链群',season:'季品',productType:'属性',mainSpu:'核心主营SPU',redLinks:'红灯链接数',yellowLinks:'黄灯链接数',score:'店铺分',problemSpus:'店铺内问题SPU数',limited:'店铺限单',offShelf:'链接下架',drop:'链接掉权',gsv:'GSV',sales:'销量',netSales:'销量',violations:'违规次数',fine:'平台罚款',frozen:'资金冻结'})[key]||key}
function rpRiskCell(k,r){const causes=rpCauses(k,r);return `<div class="rp-list-risks"><span>${esc([![1,3,4].includes(k)&&r.level?'优先级 '+r.level:'',...causes].filter(Boolean).join('；')||'—')}</span></div>`}
// 辅助指标标签用普通辅助文字颜色，后面的数值保留字段颜色。
function rpTargetText(f,showLabel=true){
 const text=String(f.target||'—'),label=f.targetTone&&text.match(/^(环比|偏差|实际|亏损率|呆滞占比|呆滞金额占比|库存|总可售天数|可售天数|我司可售货值|货值|占比) /)?.[1];
 const render=value=>/^环比(?:\s|$)|^呆滞/.test(text)||/^stale/.test(f.key||'')||f.noNumericSignal?esc(value):numberSignal(value,f.targetTone);
 if(!label)return render(text);
 const prefix=showLabel?'<span class="rp-comparison-label">'+esc(label)+'</span> ':'';
 const value=text.slice(label.length+1);
 const valueClass=label==='实际'&&value!=='—'?'rp-comparison-value rp-card-actual-value':'rp-comparison-value';
 return prefix+'<span class="'+valueClass+'">'+render(value)+'</span>';
}
function rpProductTagMarkup(tags){
 return tags?.length?'<div class="rp-product-tags">'+tags.map(t=>'<span class="rp-product-tag rp-product-tag--'+esc(t.kind)+'">'+(t.kind==='new'?'<span class="rp-product-tag-spark" aria-hidden="true">✦</span>':'')+esc(t.label)+'</span>').join('')+'</div>':'<span class="muted">—</span>';
}
function rpListCell(f,showHint=true){
 if(!f)return '<span class="muted">不适用</span>';
 if(f.linkTone)return rpPddLinkCount(f);
 if(f.key==='productType')return rpProductTagMarkup(f.tags);
 if(f.key==='season')return `<span class="rp-season-text">${esc(f.value||'—')}</span>`;
 if(f.key==='mainSpu')return rpShopCoreMarkup(f.core,f.hint);
 const warehouseName=f.key==='responsibleChannel'?' data-preserve-terms data-rp-field="responsibleChannel"':'';
 return `<div class="rp-list-value"${warehouseName}><strong class="rp-value ${f.tone}">${numberSignalMain(f)}</strong>${f.target?'<em class="'+esc(f.targetTone||'')+'">'+rpTargetText(f)+'</em>':''}</div>`;
}
function rpGroups(rows,dimension,k){return irGroups(rows,dimension).map(g=>({...g,staleUnits:g.rows.reduce((n,r)=>n+upStockFacts(r).staleUnits,0),staleValueCents:g.rows.reduce((n,r)=>n+upStockFacts(r).staleValueCents,0)})).sort((a,b)=>k===4?b.staleValueCents-a.staleValueCents:b.goodsValueCents-a.goodsValueCents)}
function rpGroupHeaders(k,dimension){return['序号',dimension==='chain'?'产品链':'品牌',k===3?'高危SPU数':'滞销SPU数','仓内库存','工厂库存','新机未交付','总库存',k===3?'高危品货值':'滞销金额','超库龄库存数','操作']}
function rpGroupValues(k,g,i){return[i+1,esc(g.name),g.count,rpCount(g.warehouse),rpCount(g.factory),rpCount(g.undelivered),rpCount(g.totalUnits),upMoney(k===3?g.goodsValueCents:g.staleValueCents),rpCount(g.staleUnits),`<button class="link" data-rp-group="${esc(String(g.key))}">查看明细</button>`]}

function rpWithListPeriod(run){const kind=rpListState.kind??0;return rpWithBoardPeriod(kind,run,rpListState.period||rpBoardPeriod(kind))}
