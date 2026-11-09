const klcHeaders=['月份','商品链接名称','链接ID','店铺名称','店铺ID'];
function klcParseImport(table){
 const errors=[],rows=[],seen=new Set(),currentRows=klcRows(),headers=(table[0]||[]).map(v=>String(v).trim()).map(name=>name==='监控月份'?'月份':name==='所属店铺'?'店铺ID':name==='商品名称'?'商品链接名称':name);
 for(const name of klcHeaders)if(!headers.includes(name))errors.push({row:1,field:name,message:'缺少必填列，请下载最新模板'});
 headers.forEach((h,i)=>{if(!klcHeaders.includes(h)||headers.indexOf(h)!==i)errors.push({row:1,field:h,message:'表头不匹配'})});
 if(table.length<2)errors.push({row:1,field:'数据',message:'文件没有数据行'});
 if(table.length>3001)errors.push({row:1,field:'数据',message:'单次最多3000条'});
 if(errors.length)return {rows,errors,revision:klcStore.revision};
 table.slice(1).forEach((cells,i)=>{
  if(cells.every(v=>!String(v).trim()))return;
  const rowNumber=cells.sourceRow||i+2,text=label=>String(cells[headers.indexOf(label)]??'').trim(),before=errors.length;
  if(cells.some(v=>String(v).startsWith('[公式：')))errors.push({row:rowNumber,field:'数据',message:'请将公式粘贴为值后导入'});
  const shop=klcShops().find(s=>String(s.shopId)===text('店铺ID'));
  const linkId=text('链接ID').replace(/^'/,''),previous=currentRows.find(r=>r.shopId===String(shop?.shopId)&&r.linkId===linkId),catalog=klcLookup(String(shop?.shopId),linkId);
  const monitorMonth=/^\d{4}\/\d{2}$/.test(text('月份'))?klcNormalizeMonth(text('月份')):'';
  if(!shop)errors.push({row:rowNumber,field:'店铺ID',message:'店铺ID不存在，请核对店铺档案'});
  // 以店铺ID＋链接ID定位；已有关联自动保留，不要求用户额外填SPU码。
  const row={shopId:String(shop?.shopId||''),linkId,spuId:previous?.spuId||catalog?.spuId||'',name:text('商品链接名称')||previous?.name||catalog?.name||'',shopName:text('店铺名称')||shop?.name||'',monitorMonth};
  try{klcValidate(row)}catch(e){errors.push({row:rowNumber,field:e.message.startsWith('请选择月份')?'月份':'数据',message:e.message})}
  if(cells.length>headers.length)errors.push({row:rowNumber,field:'数据',message:'数据列多于表头'});
  if(seen.has(klcKey(row)))errors.push({row:rowNumber,field:'链接ID',message:'文件内同月份、同店铺链接重复'});seen.add(klcKey(row));
  if(errors.length===before)rows.push({row,type:currentRows.some(existing=>klcKey(existing)===klcKey(row))?'edit':'add'});
 });
 if(!rows.length&&!errors.length)errors.push({row:2,field:'数据',message:'文件没有数据行'});
 return {rows,errors,revision:klcStore.revision};
}
function klcDownloadTemplate(){const row=klcRows()[0]||{...klcCatalog[0],monitorMonth:klcDefaultMonth()};downloadImportTemplate(klcHeaders,[],'拼多多核心链接导入模板',{required:['月份','链接ID','店铺ID'],example:[klcMonthLabel(row.monitorMonth),row.name,row.linkId,klcShopName(row.shopId),row.shopId]})}
// 覆盖范围仅来自通过整批校验的文件月份，与页面搜索和店铺筛选无关。
function klcMonthImportPlan(batch){
 const months=[...new Set(batch.rows.map(change=>change.row.monitorMonth))].sort();
 return {months,removed:klcRows().filter(row=>months.includes(klcNormalizeMonth(row.monitorMonth)))};
}
function klcReplaceMonths(batch){
 if(!batch||batch.errors.length||!batch.rows.length)throw Error('请先选择并校验文件');
 const plan=klcMonthImportPlan(batch);
 klcCommit([...plan.removed.map(row=>({type:'remove',row})),...batch.rows.map(change=>({type:'add',row:change.row}))],batch.revision);
 return plan;
}
