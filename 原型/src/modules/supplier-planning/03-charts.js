// 每个品牌/三级类目/物料的年度新增准入目标统一读取配置，不累计季度目标。
function scpCoverageRows(){
 const range=scpRange(scpState.materialPeriod),year=scpState.materialPeriod.year;
 return scpBrands.flatMap(([brand])=>scpMaterials.map(material=>{
  const categories=stMaterialCategories().map(category=>({category:category.name,categoryId:category.id,path:category.path,minimum:stMaterialAnnualTarget(year),count:scpMembers({kind:'material',brand,material,categoryId:category.id},'newAdmitted',range).length}));
  return {brand,material,categories,covered:range.future||!categories.length?null:categories.filter(row=>row.count>=row.minimum).length,range};
 }));
}
// 格子只表达覆盖进度：浅底、深字，底部进度条全部达标后转绿。
function scpCoverageCell(row){
 const {brand,material,covered,range}=row,total=row.categories.length,complete=covered===total&&total>0;
 const progress=covered===null||!total?0:Math.max(0,Math.min(100,covered/total*100));
 const empty=range.future?'尚未到统计期':total?'暂无数据':'无目标',text=covered===null?(total?'—':'无目标'):covered+'/'+total;
 return `<button type="button" class="scp-coverage-cell${complete?' is-complete':''}${covered===null?' is-unavailable':''}" style="--scp-coverage-progress:${progress}%" data-scp-coverage="${esc(JSON.stringify({brand,material}))}" data-covered="${covered??''}" aria-label="${brand} · ${material}：${covered===null?empty:'达标'+covered+'/'+total+'个三级类目'}">${text}</button>`;
}
function scpCoverageChart(){
 const rows=scpCoverageRows(),cell=(brand,material)=>scpCoverageCell(rows.find(item=>item.brand===brand&&item.material===material));
 const header='<span></span>'+scpMaterials.map(material=>`<span class="scp-coverage-axis">${material}</span>`).join(''),body=scpBrands.map(([brand])=>`<span class="scp-coverage-brand">${brand}</span>${scpMaterials.map(material=>cell(brand,material)).join('')}`).join('');
 return `<section class="scp-coverage-chart" aria-label="核心物料供应商-准入覆盖"><div class="scp-chart-heading"><div class="scp-coverage-heading"><h4 class="scp-panel-title">核心物料供应商-准入覆盖<button type="button" class="metric-help" data-scp-material-help="true" data-scp-rule-year="${scpState.materialPeriod.year}" aria-label="查看准入覆盖统计口径"></button></h4><button type="button" class="btn" data-scp-import-strategic="secondary">导入数据</button></div><div class="scp-coverage-legend"><span>达标三级类目 / 全部三级类目</span><span class="scp-coverage-progress-key">蓝：覆盖进度</span><span class="green">绿：全部达标</span></div></div><div class="scp-coverage-scroll"><div class="scp-coverage-matrix" style="--scp-material-count:${scpMaterials.length}">${header}${body}</div></div></section>`;
}
// 覆盖格和下方类目查看共用一个抽屉，只带入不同的默认筛选。
function scpOpenCoverage(brand,material){
 if(!scpBrands.some(([name])=>name===brand)||!scpMaterials.includes(material))return;
 scpOpenMaterialCategory('all',{brand,material});
}
