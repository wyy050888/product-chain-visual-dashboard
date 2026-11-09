// 模块标题统一展示判色说明，阈值直接读取实际计算配置
function ipSummaryHelp(){
 return `<span class="metric-help ip-summary-help" role="button" tabindex="0" aria-label="查看库存指标说明" data-ip-summary-help="overview" data-metric-rule="库存周转率、交付及时率判色与翻新闭环率口径"></span>`;
}
function ipRenderSummaryHelp(host,help){
 const body=metricRuleCard(host,'库存指标说明'),mode=ipMetricPeriod.mode;
 const tones=['green','yellow','red'];
 const group=(title,rows)=>{
  const section=metricRuleNode(body,'section','','metric-rule-section');metricRuleNode(section,'h5',title);
  const table=metricRuleTable(section,['周期','绿灯','黄灯','红灯'],rows.map(([label,values])=>[label,...values]),'metric-rule-band-table');
  [...table.tHead.rows[0].cells].slice(1).forEach((cell,index)=>cell.classList.add(tones[index]));
  [...table.tBodies[0].rows].forEach((row,index)=>{if(rows[index][2])row.classList.add('is-current');[...row.cells].slice(1).forEach((cell,i)=>cell.classList.add(tones[i]))});
 };
 group('库存周转率',['month','quarter','year'].map(key=>[{month:'月度',quarter:'季度',year:'年度'}[key],brcBandRows('turn.'+key).map(r=>r.text),key===mode]));
 group('交付及时率',[['全部周期',brcBandRows('delivery').map(r=>r.text)]]);
 const closure=metricRuleNode(body,'section','','metric-rule-section');metricRuleNode(closure,'h5','翻新闭环率');
 metricRuleNode(closure,'p','周期≤40天的已完成请购单数 ÷ 已完成请购单数 × 100%；包含第40天','metric-rule-note');
 metricRuleNode(closure,'p','翻新完成日期：按先进先出分配良品，累计达到该请购单请购数量时，取对应的质检日期；免检良品取审核日期','metric-rule-note');
 metricRuleNode(closure,'p','按翻新完成日期筛选已完成请购单；翻新周期＝翻新完成日期－报价完结时间，同一请购单只计一次','metric-rule-note');
}
