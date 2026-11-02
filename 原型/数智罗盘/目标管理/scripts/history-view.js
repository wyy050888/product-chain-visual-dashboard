// 简洁只读表格。新增/删除保留业务快照，修改仅显示变化字段。
(() => {
  const app=GoalPrototype,esc=app.escape,audit=app.targetAudit;
  const types={added:'新增',updated:'修改',removed:'删除'},kinds={product:'产品目标',link:'产品链接目标'};
  const month=g=>`${g.year}/${String(g.monthNumber).padStart(2,'0')}`;
  const time=value=>new Date(value).toLocaleString('zh-CN',{hour12:false}).replaceAll('-','/');
  const badge=(type,label)=>`<span class="history-badge ${esc(type)}">${esc(label)}</span>`;
  const identity=(name,code)=>`<span class="history-identity">${esc(name || '—')}<small>${esc(code || '')}</small></span>`;
  const fields=item=>item.detail.type==='updated'?item.detail.fields:audit.fields(item.group.kind);
  const fieldLabel=(kind,field)=>app.entryView.columnLabel(kind,field==='shopId'?'shop':field) || audit.labels[field];
  function value(row,field) {
    if(!row)return '—';
    if(field==='shopId')return `${row.shop || row.shopId}（${row.shopCode || row.shopId}）`;
    if(field==='linkId')return `${row.linkName || '核心链接'}（${row.linkId}）`;
    if(row[field]===''||row[field]==null)return '—';
    if(['created','updated'].includes(field))return `${row[field].name || '—'} · ${row[field].time || '—'}`;
    if(field==='gsv')return `${Number(row[field]).toFixed(2)}w`;
    if(['profit','clickRate','conversionRate','feeRate'].includes(field))return `${Number(row[field]).toFixed(2)}%`;
    if(field==='rank')return `${row[field]}名`;
    return String(row[field]);
  }
  const changeKey=({operation,group,detail})=>JSON.stringify([operation.id,group.kind,group.cid,group.year,group.monthNumber,app.targetGroup.productKey(group),detail.before?audit.detailKey(detail.before):null,detail.after?audit.detailKey(detail.after):null]);
  function changeRows(items,inBatch,expanded=[]) {
    const kind=items[0]?.group.kind || 'product',hasLinks=kind==='link',column=field=>esc(app.entryView.columnLabel(kind,field));
    // 按当前页合并同一次操作的时间、操作人和来源；分页单位是目标明细，不拆字段。
    const spans=new Map();
    items.forEach(item=>{const key=`${item.operation.id}:${item.group.source}`;spans.set(key,(spans.get(key)||0)+(expanded.includes(changeKey(item))?fields(item).length:1));});
    const shown=new Set();
    const rows=items.map(item=>{
      const {group,operation,detail}=item,row=detail.after || detail.before,list=fields(item),id=changeKey(item),opened=expanded.includes(id),count=opened?list.length:1;
      const key=`${operation.id}:${group.source}`,show=!shown.has(key);shown.add(key);
      const toggle=`<td rowspan="${count}" class="history-toggle-cell"><button class="history-toggle" data-history-toggle="${esc(id)}" aria-expanded="${opened}" aria-label="${opened?'收起':'展开'}变更明细">${opened?'收起':'展开'}</button></td>`;
      const cells=`${inBatch?`<td rowspan="${count}">${month(group)}</td><td rowspan="${count}">${identity(group.product,app.targetGroup.productCaption(group))}</td>`:show?`<td rowspan="${spans.get(key)}">${identity(time(operation.timestamp),operation.actor)}</td><td rowspan="${spans.get(key)}">${esc(group.source)}</td>`:''}<td rowspan="${count}">${identity(row.shop,row.shopCode || row.shopId)}</td>${hasLinks?`<td rowspan="${count}">${identity(row.linkName,row.linkId)}</td>`:''}<td rowspan="${count}">${badge(detail.type,types[detail.type])}</td>`;
      if(!opened)return `<tr class="history-detail-start">${cells}<td colspan="3" class="history-collapsed-summary">${list.length} 项字段：${esc(list.slice(0,3).map(field=>fieldLabel(group.kind,field)).join('、'))}${list.length>3?'等':''}</td>${toggle}</tr>`;
      return list.map((field,index)=>`<tr class="${index===0?'history-detail-start history-opened':''}">${index===0?cells:''}<td>${esc(fieldLabel(group.kind,field))}</td><td class="history-before">${esc(value(detail.before,field))}</td><td class="history-after">${esc(value(detail.after,field))}</td>${index===0?toggle:''}</tr>`).join('');
    }).join('');
    return `<div class="history-table-wrap"><table class="history-table history-diff${hasLinks?' history-diff-links':''}"><colgroup>${(hasLinks?[12,13,14,14,7,11,12,12,5]:[12,16,18,7,12,14,14,7]).map(width=>`<col style="width:${width}%">`).join('')}</colgroup><thead><tr>${inBatch?`<th>${column('month')}</th><th>${column('product')}</th>`:'<th>操作时间 / 操作人</th><th>操作来源</th>'}<th>${column('shop')}</th>${hasLinks?`<th>${column('linkId')}</th>`:''}<th>变更类型</th><th>变更字段</th><th>变更前</th><th>变更后</th><th class="history-toggle-cell">操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function syncRows(items, expanded) {
    const groups = new Map();
    items.forEach(item => {
      const key = JSON.stringify([item.group.kind, item.group.cid]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.values()].map(rows => `<h4>${esc(kinds[rows[0].group.kind])} · ${esc(rows[0].group.cid)}</h4>${changeRows(rows, true, expanded)}`).join('');
  }
  const period=op=>op.year&&op.months?.length?`${op.year}年 ${op.months.join('、')}月`:'未识别';
  function counts(op){const failed=op.status==='failed',total=op.totalRows??op.total??0;return {total,success:op.successCount??(failed?0:total),failure:op.failureCount??(failed?total:0),skipped:op.skippedCount||0,failed}}
  function batchRows(operations){
    const headers=['导入时间','文件名','操作人','总行数','成功数','失败数','状态','备注','操作'];
    return '<div class="history-table-wrap"><table class="history-table history-imports"><thead><tr>'+headers.map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+operations.map(op=>{const n=counts(op);return '<tr><td>'+esc(time(op.timestamp))+'</td><td>'+esc(op.file)+'</td><td>'+esc(op.actor)+'</td><td>'+n.total+'</td><td>'+n.success+'</td><td>'+n.failure+'</td><td>'+badge(n.failed?'failed':'success',n.failed?'导入失败':'导入成功')+'</td><td>成功 '+n.success+' 条，失败 '+n.failure+' 条，跳过空行 '+n.skipped+' 条</td><td>'+(n.failed?'<button class="text-link" data-history-failure="'+esc(op.id)+'">查看失败明细</button> <button class="text-link" data-history-download="'+esc(op.id)+'">下载失败数据</button>':'—')+'</td></tr>'}).join('')+'</tbody></table></div>';
  }
  function failureRows(op){return op.failedRows?.length?op.failedRows:[{row:'—',values:[],reason:op.reason||'旧记录未保存原始失败行'}]}
  function failureTable(op,rows){return '<div class="history-table-wrap"><table class="history-table history-failures"><thead><tr>'+['原始行号',...(op.headers||[]),'失败原因'].map(label=>'<th>'+esc(label.replace(/^\*/,''))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.row)+'</td>'+Array.from({length:op.headers?.length||0},(_,i)=>'<td>'+esc(String(row.values[i]??'—'))+'</td>').join('')+'<td>'+esc(row.reason)+'</td></tr>').join('')+'</tbody></table></div>'}
  function downloadFailure(op){
    const rows=[['原始行号',...(op.headers||[]),'失败原因'],...failureRows(op).map(row=>[row.row,...Array.from({length:op.headers?.length||0},(_,i)=>row.values[i]??''),row.reason])];
    const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=op.file.replace(/\.[^.]+$/,'')+'-失败数据.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function batchHeader(op) {
    const metadata=[['操作人',op.actor],['操作时间',time(op.timestamp)],['目标类型',kinds[op.kind]],['目标口径',op.cid],['导入周期',period(op)]];
    return `<div class="history-batch-info"><div class="history-batch-file">${badge('success','成功')}<strong>${esc(op.file)}</strong></div><dl class="history-batch-meta">${metadata.map(([label,value])=>`<div><dt>${label}：</dt><dd>${esc(value || '—')}</dd></div>`).join('')}</dl><div class="history-stats">${[['added','新增'],['updated','修改'],['removed','删除'],['unchanged','无变化'], ...(op.summary?.synced ? [['synced','关联大区及人员更新']] : [])].map(([key,label])=>`<span>${label} <strong>${op.summary?.[key] || 0}</strong></span>`).join('')}<span class="history-total">导入明细 ${op.total || 0} 条</span></div>${op.unmatched ? `<p class="edit-group-hint">其中 ${op.unmatched} 条未匹配产品档案，不参与目标消费</p>` : ''}</div>`;
  }
  app.historyView={month,changeRows,syncRows,batchRows,batchHeader,counts,failureRows,failureTable,downloadFailure};
})();
