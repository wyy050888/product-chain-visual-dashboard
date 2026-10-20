const klcHeaders=['所属店铺','链接ID','商品名称'];
function klcParseImport(table){
 const errors=[],rows=[],seen=new Set(),headers=(table[0]||[]).map(v=>String(v).trim());
 for(const name of klcHeaders.slice(0,2))if(!headers.includes(name))errors.push({row:1,field:name,message:'缺少必填列'});
 headers.forEach((h,i)=>{if(!klcHeaders.includes(h)||headers.indexOf(h)!==i)errors.push({row:1,field:h,message:'表头不匹配'})});
 if(table.length<2)errors.push({row:1,field:'数据',message:'文件没有数据行'});
 if(table.length>3001)errors.push({row:1,field:'数据',message:'单次最多3000条'});
 if(errors.length)return {rows,errors,revision:klcStore.revision};
 table.slice(1).forEach((cells,i)=>{
  if(cells.every(v=>!String(v).trim()))return;
  const text=label=>String(cells[headers.indexOf(label)]??'').trim(),before=errors.length;
  if(cells.some(v=>String(v).startsWith('[公式：')))errors.push({row:i+2,field:'数据',message:'请将公式粘贴为值后导入'});
  const shop=klcShops().find(s=>s.name===text('所属店铺')||String(s.shopId)===text('所属店铺'));
  const linkId=text('链接ID').replace(/^'/,''),previous=klcRows().find(r=>r.shopId===String(shop?.shopId)&&r.linkId===linkId),catalog=klcLookup(String(shop?.shopId),linkId);
  const row={shopId:String(shop?.shopId||''),linkId,name:text('商品名称')||previous?.name||catalog?.name||''};
  try{klcValidate(row)}catch(e){errors.push({row:i+2,field:'数据',message:e.message})}
  if(cells.length>headers.length)errors.push({row:i+2,field:'数据',message:'数据列多于表头'});
  if(seen.has(klcKey(row)))errors.push({row:i+2,field:'链接ID',message:'文件内同店铺链接重复'});seen.add(klcKey(row));
  if(errors.length===before)rows.push({row,type:previous?'edit':'add'});
 });
 if(!rows.length&&!errors.length)errors.push({row:2,field:'数据',message:'文件没有数据行'});
 return {rows,errors,revision:klcStore.revision};
}
function klcDownloadTemplate(){downloadCsv(klcHeaders,[],'核心链接配置模板')}
