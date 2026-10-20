// 判灯与悬浮提示共用阈值；边界归属与业务截图一致
const ipThresholds={turn:{month:[.85,.3],quarter:[2.5,.9],year:[10,3.6]},delivery:[98,97.5],refurb:[-15,-10]};
function ipSignal(kind,value){
 if(value===null||!Number.isFinite(value))return 'none';
 const [green,yellow]=kind==='turn'?ipThresholds.turn[periodFor().mode]||ipThresholds.turn.month:kind==='delivery'?ipThresholds.delivery:ipThresholds.refurb;
 return kind==='refurb'?(value<=green?'green':value<=yellow?'yellow':'red'):(value>=green?'green':value>=yellow?'yellow':'red');
}
function ipIndicator(kind,value){
 const tone=ipSignal(kind,value);if(tone==='none')return '<span class="muted">—</span>';
 const unit=kind==='turn'?' 次':kind==='delivery'?'%':' 天',digits=kind==='turn'?2:kind==='delivery'?1:0;
 return `<span class="ip-signal ${tone}" data-ip-signal="${kind}" data-value="${value}"><b>${fmt(value,digits)}${unit}</b></span>`;
}
const ipMetricRules={
 warehouse:{title:'我司可售库存',formula:'聚量实体仓仓库库存＋京东仓库存',note:'按SPU去重汇总，数量单位为件'},
 warehouseValue:{title:'我司可售货值',formula:'Σ（我司可售SKU库存数量 × 财务单价）',note:'只计算我司可售库存对应货值，金额单位为万元'},
 factory:{title:'工厂总库存',formula:'工厂新机良品库存＋已翻新良品库存＋工厂不良品库存＋工厂待检库存＋工厂未翻新库存',note:'数量单位为件'},
 factoryValue:{title:'工厂总货值',formula:'Σ（工厂各状态SKU库存数量 × 财务单价）',note:'包含工厂总库存的全部状态，金额单位为万元'},
 staleUnits:{title:'呆滞库存',formula:'Σ（库存台账认定的呆滞SKU库存数量）',note:'数量单位为件；沿用底层呆滞认定，不按汇总比率重新判定'},
 staleRatio:{title:'呆滞库存占比',formula:'呆滞库存数量 ÷ 总库存数量 × 100%',note:'分母包含我司、工厂及在途等库存，与呆滞榜一致'},
 staleValueRatio:{title:'呆滞金额占比',formula:'呆滞库存金额 ÷ 总库存货值 × 100%',note:'先合计货值再计算，不平均SPU占比'},
 num:{title:'库存数',formula:'仓内库存＋工厂库存',note:'仓内包含仓中与仓外库存；工厂包含良品与非良品，按SKU汇总'},
 amount:{title:'库存总金额',formula:'Σ（SKU库存数 × 财务价）',note:'财务价包含税与品牌费用'},
 turn:{title:'库存周转率',formula:'所选期间出库成本 ÷ 同期平均库存成本',note:'成本及平均库存成本沿用统一库存期间台账；近30天沿用月度阈值',groups:[['月度',...ipThresholds.turn.month],['季度',...ipThresholds.turn.quarter],['年度',...ipThresholds.turn.year]]},
 stale:{title:'呆滞库存金额',formula:'Σ（呆滞SKU库存数 × 财务价）',note:'呆滞范围沿用库存台账认定；财务价包含税与品牌费用'},
 delivery:{title:'交付及时率',formula:'所选期间交付良品数量 ÷ 所选期间计划产量 × 100%',note:'按日期汇总交付良品数量和计划产量后计算',groups:[['月度',...ipThresholds.delivery]]},
 refurb:{title:'翻新延期天数',formula:'提报时间（翻新清单总交付时间）− 产品退货时间 − 45天',note:'按提报日期归属所选期间；负数表示提前，汇总取最大值',groups:[['翻新',...ipThresholds.refurb]]}
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
// 兼容既有部门明细入口；规则只在字段问号中展示
function ipRulesNote(){return ''}
