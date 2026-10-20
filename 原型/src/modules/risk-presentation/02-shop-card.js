// 店铺卡片沿用品质榜层级：身份与四项评分在上，四项经营及风险指标在下。
// 考核店铺使用盾牌徽标；文字释义保留在悬停提示与无障碍名称中。
function rpShopAssessment(shop){return shop.assessed?'<span class="rp-shop-assessed" role="img" aria-label="考核店铺" tabindex="0" data-metric-rule="考核店铺"><svg viewBox="0 0 24 26" aria-hidden="true" focusable="false"><path d="M5 17 3.5 25 9 22.5 12 25 15 22.5 20.5 25 19 17Z" fill="#b6cbe5"/><path d="m12 1 9 3.5v8c0 5-4.2 8.5-9 11-4.8-2.5-9-6-9-11v-8Z" fill="#527cae"/><path d="m12 3 7 2.8v6.7c0 3.8-3.1 6.8-7 9-3.9-2.2-7-5.2-7-9V5.8Z" fill="#769ac5" stroke="#dce9f7" stroke-width=".8"/><path d="M12 3v18.5c3.9-2.2 7-5.2 7-9V5.8Z" fill="#6086b5"/><path d="m8 12 2.5 2.5 5.5-6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':''}
function rpShopIdentity(shop,detail=false){
 const sub='ID：'+shop.shopId+' · '+(shop.shopCategory||shcRules.pending);
 return '<div class="rp-identity rp-shop-identity">'+riskThumbnail(shop.name,true)+'<div><div class="rp-identity-title"><b class="rp-platform-name" title="'+esc(shop.name)+'"><span>'+esc(shop.name)+'</span>'+rpPlatformMark(shop.channel)+'</b>'+rpShopAssessment(shop)+'</div><small title="'+esc(sub)+'">'+esc(sub)+(detail?' <button type="button" class="link rp-detail-link" '+rpDetailAttr(1,shop)+'>详情 ›</button>':'')+'</small></div></div>';
}
// 单元格仅展示前两个名称；全部名称复用公共浮层。
function rpShopCoreMarkup(core,hint){
 const names=core.products.map(row=>row.product.name);
 if(!names.length)return '<span class="muted rp-shop-core-empty" title="'+esc(hint)+'">'+(core.available?'暂无达标产品':'暂无月度数据')+'</span>';
 const hover=names.length>2?' tabindex="0" data-rp-core-names="true" data-metric-rule="'+esc(names.join('\n'))+'"':'';
 return '<div class="rp-shop-core"'+hover+'>'+names.slice(0,2).map((name,index)=>'<span class="rp-shop-core-name"'+(names.length<=2?' title="'+esc(name)+'"':'')+'><span class="rp-shop-core-text">'+esc(name)+'</span>'+(names.length>2&&index===1?'<span class="rp-shop-core-ellipsis">...</span>':'')+'</span>').join('')+'</div>';
}
function rpShopCardColumns(){return '<div class="rp-shop-columns">'+['GSV','去退后销量','罚款＆冻结','店铺限单'].map(x=>'<span>'+x+'</span>').join('')+'</div>'}
// 卡片与店铺详情顶部共用评分及链接风险展示。
function rpShopScoreMarkup(shop,fields){
 if(shop.channel==='拼多多'&&fields.find(f=>f.key==='redLinks')?.unconfigured)return '<span class="muted">未配置核心链接</span>';
 const keys=shop.channel==='拼多多'?['redLinks','yellowLinks']:['score','productScore','logisticsScore','serviceScore'];
 return keys.map(key=>{
  const f=fields.find(field=>field.key===key);
  if(shop.channel==='拼多多')return rpPddLinkCount(f,true);
  return `<div data-rp-field="${key}"><small>${esc(f.name)}</small><strong class="${f.tone}" title="${esc(f.hint||'')}">${esc(f.value)}</strong></div>`;
 }).join('');
}
function rpShopCardEntry(shop,index){
 const fields=rpShopFields(shop),field=key=>fields.find(f=>f.key===key);
 const scores=rpShopScoreMarkup(shop,fields);
 const metrics=rpShopCardKeys.map(key=>{const f=field(key);return '<div class="rp-shop-metric" data-rp-field="'+key+'"><span class="rp-shop-mobile-label">'+f.name+'</span><strong class="'+f.tone+'" title="'+esc(f.hint)+'">'+esc(f.value)+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>'}).join('');
 return '<article class="rp-entry rp-shop-entry" data-rp-row="1:'+shop.id+'" data-rp-kind="1"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpShopIdentity(shop,true)+'<div class="rp-shop-scores'+(shop.channel==='拼多多'?' rp-shop-link-counts':'')+'">'+scores+'</div></header><div class="rp-shop-values">'+metrics+'</div></div></article>';
}

// 复用公共问号浮层；判定门槛与列表模型共用同一个常量。
function rpRenderShopCoreHelp(host){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 append(host,'h4','核心主营SPU');
 const formula=append(host,'div','','rp-core-help-threshold');
 append(formula,'strong','月度GSV ≥ '+rpShopCoreThresholdCents/1000000+'w');
}
