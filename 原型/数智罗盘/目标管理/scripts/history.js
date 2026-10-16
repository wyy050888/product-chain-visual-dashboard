// 两个入口：导入批次列表、当前目标的字段变化。只读，不修改目标或审计存储。
(() => {
  const app=GoalPrototype,{$,escape:esc}=app,view=app.historyView,filters=app.historyFilters,detailFilters=app.historyDetailFilters;
  let screen,back,opener,all=[];
  const records=()=>[...app.targetStore.operations(),...app.historyExamples.operations()]
    .map(op=>app.historyExamples.completeImport(op))
    .map(op=>app.targetAudit.normalizeImport(op))
    .map(op=>({...op,status:op.status==='demo'?'success':op.status,reason:op.reason?.replace(/本次原型演示选择|本次演示选择/g,'')}))
    .reverse().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  function open(row) {
    opener=document.activeElement;back=null;all=records();filters.options(all);
    screen={page:1,size:10,batch:null,reason:null,scroll:0,query:'',filters:filters.defaults(),detailFilters:detailFilters.defaults(),expanded:[],scope:row?{
      kind:app.state.entryTab,cid:row.cid,year:row.year,monthNumber:row.monthNumber,
      productCode:row.productCode,productMatch:row.productMatch,brand:row.brand,product:row.product,shopId:row.shopId,linkId:row.linkId || ''
    }:null};
    render();if(!$('#historyDialog').open)$('#historyDialog').showModal();
  }
  function close() {app.periodPicker.close();app.historyDateRange.close();app.historyPeriod.close();$('#historyDialog').close();opener?.focus();}
  function changes(operation) {
    const s=screen.scope,aliases=new Set(s?[app.targetAudit.detailKey(s)]:[]),result=[];
    for(const op of operation?[operation]:all)for(const group of op.groups || []) {
      if(s && (group.kind!==s.kind||group.cid!==s.cid||group.year!==s.year||group.monthNumber!==s.monthNumber||app.targetGroup.productKey(group)!==app.targetGroup.productKey(s)))continue;
      for(const detail of group.details) {
        if(s) {
          const match=row=>row&&aliases.has(app.targetAudit.detailKey(row));
          if(!match(detail.before)&&!match(detail.after))continue;
          // 只沿手动编辑的明确迁移关系向前回溯。
          if(op.source==='manual'&&detail.before&&detail.after) {
            aliases.delete(app.targetAudit.detailKey(detail.after));
            aliases.add(app.targetAudit.detailKey(detail.before));
          }
        }
        const source = detail.source || group.source;
        const crossScope = source === '大区及人员同步' && op.cid && op.cid !== group.cid;
        result.push({operation:op,group:{...group,source:crossScope ? `${source}（来自${op.cid}）` : source},detail});
      }
    }
    return result;
  }
  function render() {
    const operation=screen.batch?all.find(op=>op.id===screen.batch):null,s=screen.scope;
    const imports=!operation&&!s;
    $('#historyTitle').textContent=operation?'导入详情':s?'变更记录':'导入记录';
    $('#historyBack').hidden=!back;
    $('#historyContext').hidden=!s;
    $('#historyContext').innerHTML=s?`<strong>${esc(s.product)}</strong><span>${esc(app.targetGroup.productCaption(s))} · ${view.month(s)} · ${esc(s.cid)}${s.linkId?` · 链接ID：${esc(s.linkId)}`:''}</span>`:'';
    $('#historyBatchInfo').innerHTML=operation?view.batchHeader(operation):'';
    $('#historySearchBar').hidden=!imports;
    $('#historyFilters').hidden=!imports;filters.sync(screen.filters);
    if(!imports){app.historyDateRange.close();app.historyPeriod.close();}
    $('#historyDetailFilters').hidden=!operation;
    if($('#historySearch').value!==screen.query)$('#historySearch').value=screen.query;
    $('#historySearchClear').hidden=!screen.query;
    const query=screen.query.trim().toLocaleLowerCase();
    const items=imports?all.filter(op=>op.source==='import'&&filters.matches(op,screen.filters)&&(!query||String(op.file || '').toLocaleLowerCase().includes(query))):changes(operation).filter(item=>!operation||(app.targetAudit.inImportScope(item.group,operation)&&detailFilters.matches(item,screen.detailFilters)));
    const pages=Math.max(1,Math.ceil(items.length/screen.size));screen.page=Math.max(1,Math.min(screen.page,pages));
    const visible=items.slice((screen.page-1)*screen.size,screen.page*screen.size);
    const empty=operation?(Object.values(screen.detailFilters).some(Boolean)?'未找到匹配的变更明细':operation.summary?.synced?'本类型目标未产生变更':'本次导入未产生变更'):s?'暂无变更记录':query||Object.values(screen.filters).some(Boolean)?'未找到匹配的导入记录':'暂无导入记录';
    $('#historyResults').innerHTML=items.length?(imports?view.batchRows(visible,screen.reason):view.changeRows(visible,Boolean(operation),screen.expanded)):`<div class="history-empty">${empty}</div>`;
    if (operation) {
      const synced = changes(operation).filter(item => !app.targetAudit.inImportScope(item.group,operation) && detailFilters.matches(item,screen.detailFilters));
      const syncPages = Math.max(1, Math.ceil(synced.length / screen.size));
      screen.syncPage = Math.min(screen.syncPage || 1, syncPages);
      if (operation.summary?.synced) $('#historyResults').insertAdjacentHTML('beforeend', `<section class="history-sync"><h3>关联大区及人员更新</h3>${synced.length ? view.syncRows(synced.slice((screen.syncPage-1)*screen.size, screen.syncPage*screen.size),screen.expanded) : '<div class="history-empty">未找到匹配的关联更新</div>'}<div class="history-sync-pager">共 ${synced.length} 条关联更新 <button class="pg" data-sync-page="${screen.syncPage-1}" ${screen.syncPage===1?'disabled':''}>‹</button> ${screen.syncPage} / ${syncPages} <button class="pg" data-sync-page="${screen.syncPage+1}" ${screen.syncPage===syncPages?'disabled':''}>›</button></div></section>`);
    }
    $('#historyPager').innerHTML=`<span>共 ${items.length} ${imports?'次导入':'条变更明细'}</span><button class="pg" data-history-page="${screen.page-1}" aria-label="记录上一页" ${screen.page===1?'disabled':''}>‹</button><span>${screen.page} / ${pages}</span><button class="pg" data-history-page="${screen.page+1}" aria-label="记录下一页" ${screen.page===pages?'disabled':''}>›</button><select class="select" id="historyPageSize" aria-label="记录每页条数">${[10,20,50].map(size=>`<option value="${size}" ${screen.size===size?'selected':''}>${size}条/页</option>`).join('')}</select>`;
    $('#historyScroll').scrollTop=screen.scroll;
  }
  function init() {
    const refresh=()=>{screen.page=1;screen.syncPage=1;screen.scroll=0;screen.reason=null;render();};
    filters.init(value=>{screen.filters=value;refresh();});
    detailFilters.init(value=>{screen.detailFilters=value;refresh();});
    $('#historyReset').addEventListener('click',()=>{screen.query='';screen.filters=filters.defaults();refresh();});
    const search=event=>{
      if(event.isComposing||!screen||screen.batch||screen.scope)return;
      screen.query=$('#historySearch').value;screen.page=1;screen.scroll=0;screen.reason=null;render();
    };
    $('#historySearch').addEventListener('input',search);
    $('#historySearch').addEventListener('compositionend',search);
    $('#historySearchClear').addEventListener('click',()=>{$('#historySearch').value='';search({});$('#historySearch').focus();});
    $('#historyDialog').addEventListener('cancel',event=>{event.preventDefault();close();});
    $('#historyClose').addEventListener('click',close);
    $('#historyDialog').addEventListener('click',event=>{
      if(event.target===$('#historyDialog')) {
        const r=event.target.getBoundingClientRect();
        if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
        return;
      }
      if(event.target.closest('#historyBack')&&back) {const id=screen.batch;screen=back;back=null;render();$('#historyResults').querySelector(`[data-history-batch="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}
      const batch=event.target.closest('[data-history-batch]');
      if(batch) {
        const op=all.find(item=>item.id===batch.dataset.historyBatch);
        if(!op||op.status!=='success')return;
        screen.scroll=$('#historyScroll').scrollTop;back=structuredClone(screen);
        screen={...screen,batch:op.id,page:1,scroll:0,expanded:[],detailFilters:detailFilters.defaults()};detailFilters.configure(op);render();$('#historyBack').focus();return;
      }
      const reason=event.target.closest('[data-history-reason]');
      if(reason) {screen.reason=screen.reason===reason.dataset.historyReason?null:reason.dataset.historyReason;screen.scroll=$('#historyScroll').scrollTop;render();$('#historyResults').querySelector(`[data-history-reason="${CSS.escape(reason.dataset.historyReason)}"]`)?.focus({preventScroll:true});return;}
      const toggle=event.target.closest('[data-history-toggle]');
      if(toggle) {
        const id=toggle.dataset.historyToggle,top=toggle.getBoundingClientRect().top;
        screen.expanded=screen.expanded.includes(id)?screen.expanded.filter(key=>key!==id):[...screen.expanded,id];
        screen.scroll=$('#historyScroll').scrollTop;render();
        const button=$('#historyResults').querySelector(`[data-history-toggle="${CSS.escape(id)}"]`);
        if(button){$('#historyScroll').scrollTop+=button.getBoundingClientRect().top-top;button.focus({preventScroll:true});}
        return;
      }
      const page=event.target.closest('[data-history-page]');
      if(page&&!page.disabled) {screen.page=Number(page.dataset.historyPage);screen.scroll=0;render();}
      const syncPage=event.target.closest('[data-sync-page]');
      if(syncPage&&!syncPage.disabled) {screen.syncPage=Number(syncPage.dataset.syncPage);screen.scroll=$('#historyScroll').scrollTop;render();}
    });
    $('#historyPager').addEventListener('change',event=>{
      if(event.target.id==='historyPageSize') {screen.size=Number(event.target.value);screen.page=1;screen.scroll=0;render();}
    });
  }
  app.history={open,init};
})();
