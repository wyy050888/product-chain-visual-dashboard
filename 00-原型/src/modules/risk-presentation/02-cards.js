// 风险卡片：身份、风险入口与带名称的指标组成完整条目，不使用脱离数值的列头。
function rpValue(f){return `<strong class="rp-value ${f.tone}" ${f.key==='causes'?`title="${esc(f.value)}"`:''}>${numberSignalMain(f)}</strong>${f.target?`<em>${esc(f.target)}</em>`:''}`}
// 每项指标保留名称与值，卡片身份只显示短型号，完整SPU编码仍在列表和详情。
function rpMetricMarkup(f,primary=false){
 const labels={total:'总库存',value:'库存货值',turn:'周转率',fine:'罚款',frozen:'冻结',return:'总退货率',received:'已收退率',down:'下架',contact:'进线率',bad:'差评率',penalty:'品质处罚',coverage15:'可售天数',staleUnits:'超库龄库存',worsening:'退货恶化',warehouse:'仓内库存',returnGrowth:'总退环比',receivedGrowth:'已收退环比',loss:'净亏损',margin:'净利率',staleValue:'滞销金额'};
 const quiet=f.tone==='green'||/^(?:0(?:\.0+)?(?:元|件|次|个SPU|%|w)?(?:\/0次)?|不适用|待接入|—)$/.test(f.value);
 const display=f.key==='worsening'?f.value.replace('个SPU','个'):f.value;
 return `<div class="rp-item ${primary?'rp-primary':'rp-secondary'}${quiet?' rp-normal':''}${f.tone==='red'||f.tone==='orange'?' rp-alert':''}" data-rp-field="${f.key}" aria-label="${esc(f.name)}"><small>${netSalesLabel(f.key==='score'?f.name:labels[f.key]||f.name,f.key)}</small><div class="rp-item-value">${rpValue({...f,value:display,target:f.target})}</div></div>`;
}
// 共用官方Logo映射；未知平台不生成替代图标。
function rpPlatformMark(platform){const icon=drawerPlatformLogos[platform];return icon?`<img class="rp-platform-mark" src="assets/platform-logos/${icon}.png" width="16" height="16" alt="${esc(platform)}" title="${esc(platform)}">`:'—'}
// 合并SPU保留实际违规平台；筛选数组不能直接当作单个平台查Logo。
function rpIdentityPlatforms(k,r){
 const selected=pfSelected(r.platform||r.channel),actual=k===0&&Array.isArray(r.violatedPlatforms)?r.violatedPlatforms:selected;
 return drawerPlatformOrder.filter(name=>actual.includes(name)&&(!selected.length||selected.includes(name)));
}
function rpIdentityMarkup(k,r,list=false,detail=false,withPlatform=true){
 if(k===1)return rpShopIdentity(r,detail);
 const p=rpProduct(r),model=p?.model||r.model||'—';
 const sku=[3,4].includes(k)&&r.skuId;
 const sub=sku?(list?'SKU码：'+(r.skuCode||r.skuId):''):k===1?`ID：${r.shopId}${list?'':' · '+rpShopType(r)}`:list?`SPU码：${p?.spuCode||'—'}`:`型号 ${model}`;
 const full=sku||k===1||list?sub:`SPU码：${p?.spuCode||'—'} · 型号 ${model}`;
 const showPlatform=withPlatform&&(list?[0,6,8].includes(k):[0,6].includes(k)&&rpCardPlatform(k)==='all');
 const platforms=showPlatform?rpIdentityPlatforms(k,r):[];
 const marks=platforms.map(rpPlatformMark).join(''),icon=platforms.length>1?`<span class="rp-identity-platforms" role="group" aria-label="涉及平台：${esc(platforms.join('、'))}">${marks}</span>`:marks;
 const grade=list&&rpRankingSupportsGrade(k)&&k!==4?rpRankingGradeMarkup(r):'',inline=Boolean(icon||grade);
 const name=`<b class="${inline?'rp-platform-name':''}" title="${esc(r.name)}">${inline?'<span>'+esc(r.name)+'</span>':esc(r.name)}${icon}${grade}</b>`;
 const title=detail?`<div class="rp-identity-title">${name}<button type="button" class="link rp-detail-link" ${rpDetailAttr(k,r)} aria-label="查看${esc(r.name)}详情">详情 ›</button></div>`:name;
 const shortage=list&&sku&&k===3?`<span class="tag rp-shortage-tag ${rpShortageType(r)===1?'red':'orange'}">${esc(rpShortageTypeLabel(r))}</span>`:'';
 return `<div class="rp-identity${sku?' rp-sku-identity':''}"${sku?' data-sku-code="'+esc(r.skuCode||r.skuId)+'"':''}>${riskThumbnail(sku?p?.name||r.name:r.name,k===1)}<div>${title}${sub?'<small title="'+esc(full)+'">'+esc(sub)+'</small>':''}${shortage}</div></div>`;
}
function rpDetailAttr(k,r){
 if(k===0)return `data-qr-detail="${r.key}"`;
 if(k===8)return rpPlatformDetailAttr(r.spuId,r.channel);
 return `data-riskitem="${k},${r.id}"`;
}
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
function rpCard(k,rows,filter='',title=rpTitles[k]){
 const platforms=rpQualityPlatformKinds.includes(k),max=platforms?rpPlatformCardProducts(rows):rows.slice(0,6);
 const columns=platforms?'':k===1?rpShopCardColumns():k===2?rpLossCardColumns():[3,4].includes(k)?rpStockCardColumns(k):'';
 const entries=max.map((r,i)=>platforms?rpPlatformProductCard(k,r,i,rows):rpCardEntry(k,r,i)).join('');
 const summary=k===0?rpQualitySummaryMarkup(rpCardRows(k,'all')):'';
 const date=[6,8].includes(k)?`<div class="qr-card-date">${rpBoardRangeMarkup(k)}</div>`:'';
 return `<div class="rhead"><h3><i class="riskbadge"></i>${title}</h3>${summary}${rpBoardControlSlot(k)}<button class="link" data-risk="${k}">查看全部 ${rows.length} ›</button></div>${filter?`<div class="qr-card-filter">${filter}</div>`:''}${date}${rpPlatformMenu(k,rows)}<div class="rp-items">${columns}${entries||'<div class="empty">当前筛选下暂无风险记录</div>'}</div>`;
}
qrCard=function(){return rpCard(0,rpCardRows(0),rpCardPlatformControl(0))};
rfCard=function(k){const filter=rpCardPlatformControl(k);return rpCard(k,rpCardRows(k),filter)};
// 六榜卡片仅保留明确指定的问号；品质比率问号在完整榜单中展示。
groupRiskCardMetricHelp=function(root){
 const cards=[...root.querySelectorAll('#riskrail .riskcard')];
 if(root.matches?.('#riskrail .riskcard'))cards.unshift(root);
 for(const card of cards){
  card.querySelectorAll('.metric-help:not(.card-metric-help,.net-sales-help,.rp-stagnant-metric-help)').forEach(help=>help.remove());
  const rule=rpRenderedCardRules.get(card),title=card.querySelector('.rhead h3');
  if(!rule||!title)continue;
  addMetricHelp(title,rule);
  const help=title.querySelector('.metric-help');
  help.classList.add('card-metric-help');
  help.setAttribute('aria-label','查看'+metricLabelText(title)+'入榜条件与排序规则');
 }
};

// 首页六榜整条记录复用“详情”按钮，沿用同一平台、期间与默认标签，避免重复路由。
$('#riskrail').addEventListener('click',event=>{
 const row=event.target.closest('.rp-entry');if(!row||event.defaultPrevented)return;
 // 保留图片预览、帮助图标及已有控件的独立交互。
 if(event.target.closest('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"],[data-metric-rule]'))return;
 const selection=window.getSelection();
 if(selection&&!selection.isCollapsed&&row.contains(selection.anchorNode)&&row.contains(selection.focusNode))return;
 row.querySelector('.rp-detail-link')?.click();
});
