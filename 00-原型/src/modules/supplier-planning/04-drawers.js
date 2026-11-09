// 仅保留三级类目及覆盖图明细；供应商数量入口改用跳转提示。
const scpPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.scp-drawer');if(!root)return scpPreviousDrawerProfile(body,title);
 const categories=['categories','material-list'].includes(root.dataset.scpDrawer);
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs:categories?[]:[{key:'members',label:'类目储备'}],activeKey:categories?'base':'members'};
};

// 类目储备沿用五类目；统一物料抽屉支持跨类目的“全部”入口。
function scpCategoryTabs(category,includeAll=false){
 return `<div class="scp-category-tabs" role="tablist" aria-label="一级类目">${(includeAll?['all',...scpCategoryNames]:scpCategoryNames).map(name=>`<button type="button" role="tab" aria-selected="${name===category}" data-scp-category-tab="${esc(name)}">${name==='all'?'全部':esc(name)}</button>`).join('')}</div>`;
}
