function stMaterialTargetsView(){
 return '<section class="st-material-config"><div class="st-material-heading"><h3>二级供应商</h3></div><p class="st-common-note">每个品牌、三级类目、核心零部件统一使用年度新增准入目标。</p><table class="cec-table st-primary-table" aria-label="二级供应商目标"><thead><tr><th>适用范围</th><th>指标</th><th>目标数量</th></tr></thead><tbody><tr><th scope="row">每个品牌、三级类目、核心零部件（年度）</th><td>新增准入</td><td>'+stInput(stMaterialAnnualTarget(stEditor.year),{type:'standards',key:'materialAdmitted'},'二级供应商年度新增准入目标数量')+'</td></tr></tbody></table></section>';
}
