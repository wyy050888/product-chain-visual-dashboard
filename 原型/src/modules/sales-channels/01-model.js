// 旧调用名兼容：只读取六平台事实，不将内部销售组织映射为平台。
function salesChannelRows(platformRows=[],explicitRows=[]){
 const direct=new Map(platformRows.filter(row=>filterCatalog.platforms.includes(row.platform)).map(row=>[row.platform,row]));
 const explicit=new Map(explicitRows.filter(row=>filterCatalog.platforms.includes(row.channel)).map(row=>[row.channel,row]));
 return filterCatalog.platforms.map(channel=>{
  const row=direct.get(channel)||explicit.get(channel);if(!row)return {channel};
  const {platform,...facts}=row;return {...facts,channel};
 });
}
