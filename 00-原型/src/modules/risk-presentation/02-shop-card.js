// 店铺卡片沿用品质榜层级：身份与四项评分在上，四项经营及风险指标在下。
// 考核店铺使用盾牌徽标，并保留无障碍名称。
function rpShopAssessment(shop){return shop.assessed?'<span class="rp-shop-assessed" role="img" aria-label="考核店铺"><svg viewBox="0 0 24 26" aria-hidden="true" focusable="false"><path d="M5 17 3.5 25 9 22.5 12 25 15 22.5 20.5 25 19 17Z" fill="#b6cbe5"/><path d="m12 1 9 3.5v8c0 5-4.2 8.5-9 11-4.8-2.5-9-6-9-11v-8Z" fill="#527cae"/><path d="m12 3 7 2.8v6.7c0 3.8-3.1 6.8-7 9-3.9-2.2-7-5.2-7-9V5.8Z" fill="#769ac5" stroke="#dce9f7" stroke-width=".8"/><path d="M12 3v18.5c3.9-2.2 7-5.2 7-9V5.8Z" fill="#6086b5"/><path d="m8 12 2.5 2.5 5.5-6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':''}
function rpShopIdentity(shop,detail=false){
 const sub='ID：'+shop.shopId+' · '+(shop.shopCategory||shcRules.pending);
 const link=detail?'<button type="button" class="link rp-detail-link" '+rpDetailAttr(1,shop)+' aria-label="查看'+esc(shop.name)+'详情">详情 ›</button>':'';
 return '<div class="rp-identity rp-shop-identity">'+riskThumbnail(shop.name,true)+'<div class="rp-shop-identity-text"><div class="rp-identity-title"><b class="rp-platform-name" title="'+esc(shop.name)+'"><span>'+esc(shop.name)+'</span>'+rpPlatformMark(shop.channel)+'</b>'+rpShopAssessment(shop)+'</div><small title="'+esc(sub)+'">'+esc(sub)+'</small></div>'+link+'</div>';
}
// 单元格仅展示前两个名称；全部名称复用公共浮层。
function rpShopCoreMarkup(core,hint){
 const names=core.products.map(row=>row.product.name);
 if(!names.length)return '<span class="muted rp-shop-core-empty">'+(core.available?'暂无达标产品':'暂无近30日数据')+'</span>';
 const hover=names.length>2?' tabindex="0" data-rp-core-names="true" data-metric-rule="'+esc(names.join('\n'))+'"':'';
 return '<div class="rp-shop-core"'+hover+'>'+names.slice(0,2).map((name,index)=>'<span class="rp-shop-core-name"'+(names.length<=2?' title="'+esc(name)+'"':'')+'><span class="rp-shop-core-text">'+esc(name)+'</span>'+(names.length>2&&index===1?'<span class="rp-shop-core-ellipsis">...</span>':'')+'</span>').join('')+'</div>';
}
function rpShopCardColumns(platform){const labels={fine:'平台罚款',frozen:'资金冻结',problemSpus:'问题SPU数',offShelf:'链接下架',drop:'链接掉权',limited:'店铺限单'};return '<div class="rp-shop-columns">'+rpShopMetricKeys(platform).map(key=>'<span>'+labels[key]+'</span>').join('')+'</div>'}
// 卡片与店铺详情顶部共用评分及链接风险展示。
function rpShopScoreMarkup(shop,fields,layout='tags'){
 if(shop.channel==='拼多多'&&fields.find(f=>f.key==='redLinks')?.unconfigured)return '<span class="muted">未配置核心链接</span>';
 const keys=shop.channel==='拼多多'?['redLinks','yellowLinks']:['score','productScore','logisticsScore','serviceScore'];
 return keys.map(key=>{
  const f=fields.find(field=>field.key===key);
  if(shop.channel==='拼多多'){
   if(layout!=='summary')return rpPddLinkCount(f,true);
   const label=f.linkTone==='red'?'红灯链接':'黄灯链接',count=Number.isFinite(f.sortValue)?f.sortValue:'--';
   return `<div class="rp-pdd-count rp-pdd-count--${f.linkTone} rp-pdd-count--card rp-shop-link-summary" data-rp-field="${key}" aria-label="${label} ${count}条"><span class="rp-shop-link-label">${label}</span><span class="rp-shop-link-value"><strong class="rp-quality-${f.linkTone}">${count}</strong><small>条</small></span></div>`;
  }
  return `<div data-rp-field="${key}"><small>${netSalesLabel(f.name,f.key)}</small><strong class="${f.tone}">${numberSignalMain(f)}</strong></div>`;
 }).join('');
}
function rpShopCardEntry(shop,index){
 const fields=rpShopFields(shop),field=key=>fields.find(f=>f.key===key);
 const scores=rpShopScoreMarkup(shop,fields,'summary');
 const keys=rpShopMetricKeys(shop.channel),metrics=keys.map(key=>{const f=field(key);return '<div class="rp-shop-metric" data-rp-field="'+key+'"><span class="rp-shop-mobile-label">'+netSalesLabel(f.name,key)+'</span><strong class="'+f.tone+'">'+numberSignalMain(f)+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>'}).join('');
 return '<article class="rp-entry rp-shop-entry" data-rp-row="1:'+shop.id+'" data-rp-kind="1"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpShopIdentity(shop,true)+(scores?'<div class="rp-shop-scores'+(shop.channel==='拼多多'?' rp-shop-link-counts':'')+'">'+scores+'</div>':'')+'</header><div class="rp-shop-values" style="--rp-shop-metrics:'+keys.length+'">'+metrics+'</div></div></article>';
}

// 复用公共问号浮层；判定门槛与列表模型共用同一个常量。
function rpRenderShopCoreHelp(host){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 append(host,'h4','核心主营SPU');
 const formula=append(host,'div','','rp-core-help-threshold');
 append(formula,'strong','近30日GSV ≥ '+rpShopCoreThresholdCents/1000000+'w');
}
