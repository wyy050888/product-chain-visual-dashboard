function scpRenderMaterialHelp(host,year){
 const body=metricRuleCard(host,'核心物料准入覆盖');
 metricRuleNode(body,'p','按所选年度首次准入统计，各品牌、三级类目、零部件分别按供应商去重。','metric-rule-note');
 metricRuleList(body,[
  {title:'达标条件',value:'年度新增准入 ≥ '+stMaterialAnnualTarget(year)+'家'},
  {title:'格子含义',value:'达标类目数 / 全部类目数；全部达标为绿色'}
 ]);
}
