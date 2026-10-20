const klcState={query:'',shopId:'',page:1};
const klcRoute='#system-core-links';
const klcOption=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function klcShopName(id){return klcShops().find(s=>String(s.shopId)===id)?.name||id}
smRegisterPage({route:klcRoute,id:'klc-page',group:'目标管理',title:'核心链接配置',menuOrder:40,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">核心链接配置</h2><div class="sm-page-tabs" id="klc-tabs" role="tablist" aria-label="核心链接平台"><button type="button" role="tab" aria-selected="true" class="active">拼多多</button></div></header><section class="lt-panel klc-panel"><div class="ui-business-filters klc-filters"><label class="ui-search-field"><input id="klc-query" type="search" placeholder="搜索商品名称、链接ID" aria-label="搜索核心链接"></label><label><span>所属店铺</span><select id="klc-shop" aria-label="筛选所属店铺"></select></label><button class="link" id="klc-reset">重置</button></div><div class="klc-actions"><button class="klc-button" id="klc-import">导入</button><button class="klc-button" id="klc-template">下载模板</button></div><div class="klc-table-scroll"><table class="klc-table"><thead><tr>${['商品信息','所属店铺','更新人','更新时间','操作'].map(x=>'<th>'+x+'</th>').join('')}</tr></thead><tbody id="klc-body"></tbody></table></div><div id="klc-pagination"></div></section>`,onShow:klcRender});
function klcRender(){
 $('#klc-query').value=klcState.query;$('#klc-shop').innerHTML=klcOption('','全部',klcState.shopId)+klcShops().map(s=>klcOption(String(s.shopId),s.name,klcState.shopId)).join('');decorateFilterFields($('#klc-page .klc-filters'));klcRenderRows();
}
function klcRenderRows(){
 const query=klcState.query.trim().toLowerCase(),rows=klcRows().filter(r=>(!klcState.shopId||r.shopId===klcState.shopId)&&(!query||[r.name,r.linkId].join(' ').toLowerCase().includes(query)));
 klcState.page=Math.min(klcState.page,Math.max(1,Math.ceil(rows.length/10)));
 $('#klc-body').innerHTML=rows.slice((klcState.page-1)*10,klcState.page*10).map(r=>`<tr data-klc-row="${esc(klcKey(r))}"><td><strong>${esc(r.name||'--')}</strong><small>ID：${esc(r.linkId)}</small></td><td>${esc(klcShopName(r.shopId))}</td><td>${esc(r.actor)}</td><td>${esc(r.updatedAt||'—')}</td><td class="klc-row-actions"><button data-klc-edit="${esc(klcKey(r))}">编辑</button><button data-klc-remove="${esc(klcKey(r))}">移除</button></td></tr>`).join('')||'<tr><td colspan="5" class="klc-empty">暂无核心链接</td></tr>';
 const pager=$('#klc-pagination');pager.innerHTML=listPager(rows.length,klcState.page,10);bindListPager(pager,p=>{klcState.page=p;klcRenderRows()});
}
function klcDialog(id){const d=document.createElement('dialog');d.id=id;d.className='klc-dialog';document.body.append(d);return d}
const klcEditor=klcDialog('klc-editor'),klcImportDialog=klcDialog('klc-import-dialog'),klcRemoveDialog=klcDialog('klc-remove-dialog');
function klcDialogContent(title,body,actions){return `<header><h2>${title}</h2><button type="button" class="klc-close" data-klc-close aria-label="关闭">×</button></header><div class="klc-dialog-body">${body}</div><footer><p class="klc-error" role="alert"></p><div><button type="button" class="klc-button" data-klc-close>取消</button>${actions}</div></footer>`}
let klcDraft=null,klcBatch=null,klcReadToken=0;
function klcOpenEditor(row){
 if(!row)return;
 klcDraft={revision:klcStore.revision,...row};const d=klcDraft;
 klcEditor.innerHTML=klcDialogContent('编辑链接',`<div class="klc-form"><label>所属店铺 <em>*</em><select name="shopId" disabled>${klcShops().map(s=>klcOption(String(s.shopId),s.name,d.shopId)).join('')}</select></label><label>链接ID <em>*</em><input name="linkId" type="text" inputmode="numeric" maxlength="64" autocomplete="off" value="${esc(d.linkId)}" readonly placeholder="请输入链接ID"></label><label>商品名称<input name="name" maxlength="100" value="${esc(d.name)}" placeholder="请输入商品名称"></label></div>`,'<button class="klc-button primary" id="klc-save">保存</button>');
 klcEditor.showModal();
}
function klcImportPreview(){
 const b=klcBatch,host=klcImportDialog.querySelector('[data-klc-preview]');if(!b){host.innerHTML='';return}
 const errors=b.errors.length;host.innerHTML=errors?`<p class="klc-error">校验失败 ${errors} 条</p><div class="klc-table-scroll"><table class="klc-table"><thead><tr><th>行号</th><th>字段</th><th>错误</th></tr></thead><tbody>${b.errors.slice(0,100).map(e=>`<tr><td>${e.row}</td><td>${esc(e.field)}</td><td>${esc(e.message)}</td></tr>`).join('')}</tbody></table></div><button class="link" id="klc-errors">下载错误明细</button>`:`<p>新增 ${b.rows.filter(r=>r.type==='add').length} 条，更新 ${b.rows.filter(r=>r.type==='edit').length} 条</p><div class="klc-table-scroll"><table class="klc-table"><thead><tr><th>所属店铺</th><th>链接ID</th><th>商品名称</th><th>操作</th></tr></thead><tbody>${b.rows.slice(0,100).map(c=>`<tr><td>${esc(klcShopName(c.row.shopId))}</td><td>${esc(c.row.linkId)}</td><td>${esc(c.row.name||'--')}</td><td>${c.type==='add'?'新增':'更新'}</td></tr>`).join('')}</tbody></table></div>${b.rows.some(c=>c.type==='edit')?'<label class="klc-overwrite"><input type="checkbox" id="klc-overwrite">确认更新已有链接</label>':''}`;
 $('#klc-confirm-import').disabled=errors>0||!b.rows.length||b.rows.some(c=>c.type==='edit');
}
function klcOpenImport(){klcBatch=null;klcReadToken++;klcImportDialog.innerHTML=klcDialogContent('导入核心链接','<label class="klc-upload">选择文件<input id="klc-file" type="file" accept=".xlsx,.csv"></label><div data-klc-preview></div>','<button class="klc-button primary" id="klc-confirm-import" disabled>确认导入</button>');klcImportDialog.showModal()}
