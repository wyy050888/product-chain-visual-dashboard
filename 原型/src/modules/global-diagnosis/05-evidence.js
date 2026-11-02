// 现用分析抽屉的布局、记录定位及文本分区；任务依据在任务详情内展开。
const gdPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.gd-dialog');if(!root)return gdPreviousDrawerProfile(body,title);
 if(root.matches('.gd-report-dialog'))return {
  root,entries:[...root.children].map(node=>({node,key:node.dataset.gdReportPane||'shared'})),
  
  tabs:[{key:'report',label:'报告'},{key:'sources',label:'来源依据'}]
 };
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs:[]};
};
function gdFind(id,data=gdRenderedData||gdDataset()){return [...gdSectionRows(data),...data.work,...data.deviations,...data.improvements,...data.mismatch,...data.reports,...data.focus,...data.tasks,...data.origins].find(r=>r.id===id)}
function gdTextSection(title,value){return value?`<section class="gd-detail-section gd-text-section"><h5>${title}</h5><p>${gdReadableMarkup(value)}</p></section>`:''}
