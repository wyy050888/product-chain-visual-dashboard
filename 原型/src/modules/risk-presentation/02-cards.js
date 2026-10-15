// 风险卡片：身份、风险入口与带名称的指标组成完整条目，不使用脱离数值的列头。
function rpValue(f){return `<strong class="rp-value ${f.tone}" ${(f.hint||f.key==='causes')?`title="${esc(f.key==='causes'?f.value:f.hint)}"`:''}>${esc(f.value)}</strong>${f.target?`<em>${esc(f.target)}</em>`:''}`}
// 每项指标保留名称与值，卡片身份只显示短型号，完整SPU编码仍在列表和详情。
function rpMetricMarkup(f,primary=false){
 const labels={total:'总库存',value:'库存货值',turn:'周转率',fine:'罚款',frozen:'冻结',return:'总退货率',received:'已收退率',down:'下架',contact:'进线率',bad:'差评率',penalty:'品质处罚',coverage15:'可售天数',staleUnits:'超库龄库存',worsening:'退货恶化',warehouse:'仓内库存',returnGrowth:'总退环比',receivedGrowth:'已收退环比',loss:'净亏损',margin:'净利率',staleValue:'滞销金额'};
 const quiet=f.tone==='green'||/^(?:0(?:\.0+)?(?:元|件|次|个SPU|%|w)?(?:\/0次)?|不适用|待接入|—)$/.test(f.value);
 const display=f.key==='worsening'?f.value.replace('个SPU','款'):f.value;
 return `<div class="rp-item ${primary?'rp-primary':'rp-secondary'}${quiet?' rp-normal':''}${f.tone==='red'||f.tone==='orange'?' rp-alert':''}" data-rp-field="${f.key}" aria-label="${esc(f.name)}"><small title="${esc(f.name+(f.hint?'：'+f.hint:''))}">${esc(f.key==='score'?f.name:labels[f.key]||f.name)}</small><div class="rp-item-value">${rpValue({...f,value:display,target:f.target})}</div></div>`;
}
// 共用官方Logo映射；未知平台不生成替代图标。
function rpPlatformMark(platform){const icon=drawerPlatformLogos[platform];return icon?`<img class="rp-platform-mark" src="assets/platform-logos/${icon}.png" width="16" height="16" alt="${esc(platform)}" title="${esc(platform)}">`:'—'}
function rpIdentityMarkup(k,r,list=false,detail=false){
 if(k===1)return rpShopIdentity(r,detail);
 const p=rpProduct(r),model=p?.model||r.model||'—',platform=r.platform||r.channel;
 const sub=k===1?`ID：${r.shopId}${list?'':' · '+rpShopType(r)}`:list?`SPU码：${p?.spuCode||'—'}`:`型号 ${model}`;
 const full=k===1||list?sub:`SPU码：${p?.spuCode||'—'} · 型号 ${model}`;
 const showPlatform=k===1||(k===6&&list),icon=showPlatform?rpPlatformMark(platform):'';
 const name=`<b class="${showPlatform?'rp-platform-name':''}" title="${esc(r.name)}">${showPlatform?'<span>'+esc(r.name)+'</span>':esc(r.name)}${icon}</b>`;
 const title=detail?`<div class="rp-identity-title">${name}<button type="button" class="link rp-detail-link" ${rpDetailAttr(k,r)} aria-label="查看${esc(r.name)}详情">详情 ›</button></div>`:name;
 return `<div class="rp-identity">${riskThumbnail(r.name,k===1)}<div>${title}<small title="${esc(full)}">${esc(sub)}</small></div></div>`;
}
function rpDetailAttr(k,r){return k===0?`data-qr-detail="${r.key}"`:`data-riskitem="${k},${r.id}"`}
// 品质榜使用独立五指标试版；其他榜保留原主辅指标布局。
function rpCardEntry(k,r,i){
 if(k===0)return rpQualityCardEntry(r,i);
 if(k===1)return rpShopCardEntry(r,i);
 if(k===2)return rpLossCardEntry(r,i);
 if(k===6)return rpReturnCardEntry(r,i);
 if(k===3||k===4)return rpStockCardEntry(k,r,i);
 const keys=k===1?['score','frozen','fine','gsv','penalty','worsening']:rpCardKeys[k];
 const fields=rpFields(k,r,keys).filter(f=>f.key!=='causes'),primaryCount=k===0?4:3;
 return `<article class="rp-entry" style="--rp-primary-columns:${primaryCount}" data-rp-row="${k}:${r.id}" data-rp-kind="${k}"><div class="rp-entry-main"><header><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span>${rpIdentityMarkup(k,r,false,true)}</header><div class="rp-key-metrics">${fields.slice(0,primaryCount).map(f=>rpMetricMarkup(f,true)).join('')}</div></div><div class="rp-entry-bottom"><div class="rp-support-metrics">${fields.slice(primaryCount).map(f=>rpMetricMarkup(f)).join('')}</div></div></article>`;
}
function rpCard(k,rows,filter=''){
 const max=rows.slice(0,6);
 return `<div class="rhead"><h3><i class="riskbadge"></i>${rpTitles[k]}</h3><button class="link" data-risk="${k}">查看全部 ${rows.length} ›</button></div>${filter?`<div class="qr-card-filter">${filter}</div>`:''}<div class="qr-card-date">${riskRangeText()}${k===2?' · '+(rpCardPlatformState.value==='all'?'全公司':Array.isArray(rpCardPlatformState.value)?rpCardPlatformState.value.join('、'):rpCardPlatformState.value)+' · 净利测算':k===3?' · 全公司库存快照 '+DATA_CUTOFF:k===4?' · 公司库存':''}</div><div class="rp-items">${k===0?rpQualityCardColumns():k===1?rpShopCardColumns():k===2?rpLossCardColumns():[3,4].includes(k)?rpStockCardColumns(k):k===6?rpReturnCardColumns():''}${max.map((r,i)=>rpCardEntry(k,r,i)).join('')||`<div class="empty">当前筛选下暂无风险记录</div>`}</div>`;
}
qrCard=function(){return rpCard(0,rpCardRows(0),rpCardPlatformControl(0))};
rfCard=function(k){const filter=rpCardPlatformControl(k);return rpCard(k,rpCardRows(k),filter)};
// 六榜仅保留标题问号，内容由当前榜单入池与排序规则提供。
groupRiskCardMetricHelp=function(root){
 const cards=[...root.querySelectorAll('#riskrail .riskcard')];
 if(root.matches?.('#riskrail .riskcard'))cards.unshift(root);
 for(const card of cards){
  card.querySelectorAll('.metric-help:not(.card-metric-help)').forEach(help=>help.remove());
  const rule=rpRenderedCardRules.get(card),title=card.querySelector('.rhead h3');
  if(!rule||!title)continue;
  addMetricHelp(title,rule);
  const help=title.querySelector('.metric-help');
  help.classList.add('card-metric-help');
  help.setAttribute('aria-label','查看'+metricLabelText(title)+'入榜条件与排序规则');
 }
};
