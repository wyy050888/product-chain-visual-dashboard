// 导出复用列表的字段及完整筛选结果，不按分页截取，不修改关系或导入记录。
function ssiExportValue(key,row){
 if(key==='updatedAt'){
  const time=Date.parse(row[key]);
  return Number.isFinite(time)?new Date(time).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).replaceAll('-','/'):'';
 }
 const value=row[key]??'';
 return ['admitted','cooperation'].includes(key)?String(value).replaceAll('-','/'):String(value);
}
function ssiExport(){
 const tier=ssiState.tier,rows=ssiRows();
 if(!rows.length){toast('当前筛选下暂无可导出数据');return}
 try{
  const fields=ssiListFields(tier),headers=fields.map(([,label])=>label),data=rows.map(row=>fields.map(([key])=>ssiExportValue(key,row))),label=ssiTierLabels[tier];
  const layout={widths:fields.map(([key])=>key==='name'?34:key.toLowerCase().includes('category')?44:key==='productName'?46:key==='productCode'?34:key==='updatedAt'?25:20),rowHeight:42};
  downloadImportTemplate(headers,data,label+'_'+(ssiViewState().year==='all'?'全部年份':ssiViewState().year+'年')+'_'+dashboardToday(),{sheets:[{name:label,headers,rows:data,layout}]});
  toast('已导出'+rows.length+'条记录');
 }catch(_){toast('导出失败，请重试')}
}
