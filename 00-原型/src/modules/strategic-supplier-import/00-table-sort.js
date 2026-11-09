// 两个Tab独立排序；按原始日期比较，缺失日期在任一方向都置后。
const ssiDateSortKeys=['updatedAt','admitted','cooperation'];
function ssiDefaultSort(){return {key:'updatedAt',direction:'desc'}}
function ssiSortRows(rows,sort){return rpSortRows(rows,sort,(row,key)=>row[key]?Date.parse(row[key]):null)}
function ssiSortHeading(key,label,sort){
 return ssiDateSortKeys.includes(key)?rpSortHeader(key,label,sort,undefined,ssiDefaultSort()).replaceAll('榜单排序','默认顺序'):esc(label);
}
// 按字段声明列宽，两个Tab不共用列序号；最低宽度也约束历史窄列偏好。
function ssiSetColumnWidths(table,columns){
 const widths={name:260,admitted:140,admissionCategory:300,admissionMaterial:180,availableBrand:150,cooperation:140,categoryPath:300,cooperationMaterial:180,productCode:280,productName:320,brand:140,introductionRating:110,cooperationRating:110,actor:100,updatedAt:180,actions:80};
 table.dataset.columnDefaults=JSON.stringify(Object.fromEntries(columns.map(([key],index)=>[index,widths[key]])));
 table.dataset.columnMinimums=JSON.stringify(Object.fromEntries(columns.flatMap(([key],index)=>['admitted','cooperation','categoryPath','cooperationMaterial','productCode','productName','actor','updatedAt','actions'].includes(key)?[[index,widths[key]]]:[])));
}
