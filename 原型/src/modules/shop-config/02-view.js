function shcFilterSelect(key,label,values){
 return `<label class="shc-filter"><span>${label}</span><select data-shc-filter="${key}" aria-label="配置筛选${label}"><option value="all">全部</option>${values.map(value=>{const [id,text]=Array.isArray(value)?value:[value,value];return `<option value="${esc(id)}" ${shcState[key]===id?'selected':''}>${esc(text)}</option>`}).join('')}</select></label>`;
}
function shcRenderPlatforms(){
 const rows=shcRows();$('#shc-platforms').innerHTML=['all',...shcPlatforms].map(platform=>`<button type="button" data-shc-platform="${platform}" aria-pressed="${shcState.platform===platform}" class="${shcState.platform===platform?'active':''}">${platform==='all'?'全平台':rpPlatformMark(platform)+'<span>'+platform+'</span>'}<small>${rows.filter(shop=>platform==='all'||shop.channel===platform).length}</small></button>`).join('');
}
function shcRenderTable(){
 const rows=shcFiltered();shcState.page=Math.max(1,Math.min(shcState.page,Math.ceil(rows.length/DRAWER_PAGE_SIZE)||1));
 const visible=rows.slice((shcState.page-1)*DRAWER_PAGE_SIZE,shcState.page*DRAWER_PAGE_SIZE);
 $('#shc-results').innerHTML=`<table class="shc-table"><colgroup><col style="width:140px"><col><col style="width:140px"><col style="width:200px"><col style="width:160px"></colgroup><thead><tr><th>平台</th><th>店铺信息</th><th>品牌</th><th>店铺分类</th><th>是否考核店铺</th></tr></thead><tbody>${visible.length?visible.map(shop=>`<tr data-shc-row="${esc(shcKey(shop))}"><td><span class="shc-platform">${rpPlatformMark(shop.channel)}<span>${shop.channel}</span></span></td><td><b>${esc(shop.name)}</b><small>ID：${esc(shop.shopId)}</small></td><td>${esc(shop.brand)}</td><td><select data-shc-category="${esc(shcKey(shop))}" aria-label="店铺分类：${esc(shop.name)}">${shcCategories.map(value=>`<option ${shop.shopCategory===value?'selected':''}>${value}</option>`).join('')}</select></td><td><button type="button" class="shc-switch" role="switch" aria-checked="${shop.assessed}" aria-label="是否考核：${esc(shop.name)}" data-shc-assessed="${esc(shcKey(shop))}"><i aria-hidden="true"></i></button><span class="shc-switch-text">${shop.assessed?'是':'否'}</span></td></tr>`).join(''):'<tr><td colspan="5" class="shc-empty">暂无符合条件的店铺</td></tr>'}</tbody></table>`;
 mountListPager($('#shc-pages'),rows.length,shcState.page,page=>{shcState.page=page;shcRenderTable()});$('#shc-error').textContent=shcState.error;
}
function shcRenderPage(){
 $('#shc-return').hidden=!shcState.returnList;shcRenderPlatforms();
 $('#shc-filters').innerHTML=`<input type="search" data-shc-search aria-label="搜索店铺名称/店铺ID" placeholder="搜索店铺名称/店铺ID" value="${esc(shcState.query)}">${shcFilterSelect('brand','品牌',[...new Set(shcRows().map(shop=>shop.brand))])}${shcFilterSelect('category','店铺分类',shcCategories)}${shcFilterSelect('assessed','是否考核',[['yes','是'],['no','否']])}<button type="button" class="link" data-shc-reset>重置</button>`;
 shcRenderTable();
}
