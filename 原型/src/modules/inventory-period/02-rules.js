// 判灯与悬浮提示共用阈值；边界归属与业务截图一致。
const ipThresholds={turn:{month:[.85,.3],quarter:[2.5,.9],year:[10,3.6]},delivery:[98,97.5],refurb:[-15,-10]};
function ipSignal(kind,value){
 if(value===null||!Number.isFinite(value))return 'none';
 const [green,yellow]=kind==='turn'?ipThresholds.turn[periodFor().mode]||ipThresholds.turn.month:kind==='delivery'?ipThresholds.delivery:ipThresholds.refurb;
 return kind==='refurb'?(value<=green?'green':value<=yellow?'yellow':'red'):(value>=green?'green':value>=yellow?'yellow':'red');
}
function ipIndicator(kind,value){
 const tone=ipSignal(kind,value);if(tone==='none')return '<span class="muted">—</span>';
 const unit=kind==='turn'?' 次/'+ipPeriod().unit:kind==='delivery'?'%':' 天',digits=kind==='turn'?2:kind==='delivery'?1:0;
 return `<span class="ip-signal ${tone}" data-ip-signal="${kind}" data-value="${value}"><b>${fmt(value,digits)}${unit}</b><small>● ${ipSignalLabel(kind,value)}</small></span>`;
}
function ipSignalLabel(kind,value){return {green:'绿灯',yellow:'黄灯',red:'红灯',none:'无数据'}[ipSignal(kind,value)]}
const ipMetricRules={
 num:{title:'库存数',formula:'仓内库存＋工厂库存',note:'仓内包含仓中与仓外库存；工厂包含良品与非良品，按SKU汇总。'},
 amount:{title:'库存总金额',formula:'Σ（SKU库存数 × 财务价）',note:'财务价包含税与品牌费用。'},
 turn:{title:'库存周转率',formula:'本月出库成本 ÷ 本月平均库存成本',note:'平均库存＝（月初库存成本＋当前库存成本）÷2；固定展示本月累计，不折算完整月。',groups:[['月度',...ipThresholds.turn.month],['季度',...ipThresholds.turn.quarter],['年度',...ipThresholds.turn.year]]},
 stale:{title:'呆滞库存金额',formula:'Σ（呆滞SKU库存数 × 财务价）',note:'呆滞库存为库龄超过90天的库存；财务价包含税与品牌费用。'},
 delivery:{title:'月交付及时率',formula:'本月按期交付量 ÷ 本月计划交付量 × 100%',note:'汇总按交付量加权，不平均各SKU百分比；无计划交付量显示“—”。',groups:[['月度',...ipThresholds.delivery]]},
 refurb:{title:'翻新延期天数',formula:'翻新清单提报日期 − 产品退货日期 − 45天',note:'负数表示在45天期限前提报；汇总取最大值，缺少日期显示“—”。',groups:[['翻新',...ipThresholds.refurb]]}
};
function ipHelp(key){const r=ipMetricRules[key];return `<span class="metric-help ip-metric-help" role="button" tabindex="0" aria-label="查看${r.title}规则" data-ip-rule="${key}" data-metric-rule="${esc(r.formula+'；'+r.note)}"></span>`}
function ipHeading(key,label=ipMetricRules[key].title){return `<span class="ip-field-heading">${label}${ipHelp(key)}</span>`}
function renderInventoryMetricTooltip(host,key){
 const rule=ipMetricRules[key],append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 append(host,'h4',rule.title);append(host,'div',rule.formula,'ip-tip-formula');append(host,'p',rule.note,'ip-tip-note');
 if(!rule.groups)return;
 const list=append(host,'div','','ip-tip-rules');
 for(const [label,green,yellow] of rule.groups){
  const section=append(list,'section','','ip-tip-group');if(rule.groups.length>1)append(section,'h5',label+'红绿灯');
  const lower=key==='refurb',rows=lower?[['green','绿灯',`天数 ≤ ${green}天`],['yellow','黄灯',`${green}天 ＜ 天数 ≤ ${yellow}天`],['red','红灯',`天数 ＞ ${yellow}天`]]:[['green','绿灯',`数值 ≥ ${green}${key==='delivery'?'%':'次'}`],['yellow','黄灯',`${yellow}${key==='delivery'?'%':'次'} ≤ 数值 ＜ ${green}${key==='delivery'?'%':'次'}`],['red','红灯',`数值 ＜ ${yellow}${key==='delivery'?'%':'次'}`]];
  for(const [tone,name,value] of rows){const row=append(section,'div','','ip-tip-row');append(row,'span',name,'ip-tip-light '+tone);append(row,'span',value)}
 }
}
function ipDeliveryLabel(){return periodFor().mode==='month'?'月交付及时率':periodFor().mode==='quarter'?'季交付及时率':'年度交付及时率'}
// 兼容既有部门明细入口；规则只在字段问号中展示。
function ipRulesNote(){return ''}
