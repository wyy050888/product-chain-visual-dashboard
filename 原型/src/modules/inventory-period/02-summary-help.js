// 模块标题统一展示判色说明，阈值直接读取实际计算配置
function ipSummaryHelp(){
 return `<span class="metric-help ip-summary-help" role="button" tabindex="0" aria-label="查看库存指标说明" data-ip-summary-help="overview" data-metric-rule="库存周转率、交付及时率判色与翻新闭环率口径"></span>`;
}
function ipRenderSummaryHelp(host,help){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 const mode=ipMetricPeriod.mode;
 const heading=append(host,'header','','ip-summary-heading');
 append(heading,'h4','库存指标说明');
 const body=append(host,'div','','ip-summary-body');
 const tones=[['green','绿灯'],['yellow','黄灯'],['red','红灯']];
 const group=(title,rows)=>{
  const section=append(body,'section','','ip-summary-section');append(section,'h5',title);
  const table=append(section,'table','','ip-summary-rules'),head=append(table,'thead',''),tr=append(head,'tr','');
  append(tr,'th','周期');for(const [tone,label] of tones)append(tr,'th',label,tone);
  const tbody=append(table,'tbody','');
  for(const [label,values,current] of rows){
   const row=append(tbody,'tr','',current?'is-current':'');append(row,'th',label);
   for(let i=0;i<values.length;i++)append(row,'td',values[i],tones[i][0]);
  }
 };
 group('库存周转率',['month','quarter','year'].map(key=>[{month:'月度',quarter:'季度',year:'年度'}[key],brcBandRows('turn.'+key).map(r=>r.text),key===mode]));
 group('交付及时率',[['全部周期',brcBandRows('delivery').map(r=>r.text)]]);
 const closure=append(body,'section','','ip-summary-section');append(closure,'h5','翻新闭环率');
 append(closure,'p','40天内完成的翻新请购单数 ÷ 已完成翻新请购单数 × 100%；第40天完成计入达标','ip-summary-note');
 append(closure,'p','按翻新交付完成日期归属期间；周期＝交付完成日期－报价完结时间，未完成单不参与比率计算','ip-summary-note');
}
