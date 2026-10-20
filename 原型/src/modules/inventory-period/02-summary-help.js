// 两个标题共用判色说明，阈值直接读取实际计算配置
function ipSummaryHelp(dimension){
 const label=dimension==='category'?'类目库存':'品牌库存';
 return `<span class="metric-help ip-summary-help" role="button" tabindex="0" aria-label="查看${label}指标判色规则" data-ip-summary-help="${dimension}" data-metric-rule="库存周转率、交付及时率、翻新延期天数的红黄绿灯规则"></span>`;
}
function ipRenderSummaryHelp(host,help){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 const mode=ipMetricPeriods[help.dataset.ipSummaryHelp].mode,period={recent30:'近30天',month:'月',quarter:'季',year:'年'}[mode];
 const heading=append(host,'header','','ip-summary-heading');
 append(heading,'h4','库存指标判色规则');append(heading,'span','当前：'+period,'ip-summary-period');
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
 group('库存周转率',Object.entries(ipThresholds.turn).map(([key,[green,yellow]])=>[
  {month:'月度 / 近30天',quarter:'季度',year:'年度'}[key],
  [`≥ ${green}次`,`${yellow} ≤ 数值 < ${green}次`,`< ${yellow}次`],key===(mode==='recent30'?'month':mode)
 ]));
 const [deliveryGreen,deliveryYellow]=ipThresholds.delivery,[refurbGreen,refurbYellow]=ipThresholds.refurb;
 group('交付及时率',[['全部周期',[`≥ ${deliveryGreen}%`,`${deliveryYellow}% ≤ 数值 < ${deliveryGreen}%`,`< ${deliveryYellow}%`]]]);
 group('翻新延期天数',[['全部周期',[`≤ ${refurbGreen}天`,`${refurbGreen}天 < 天数 ≤ ${refurbYellow}天`,`> ${refurbYellow}天`]]]);
 append(body,'p','近30天沿用月度周转率阈值，负延期天数表示提前','ip-summary-note');
}
