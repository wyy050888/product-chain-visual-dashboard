// 抽屉只组织现有内容，不复制台账、不替换表单与事件节点。
const drawerPaneNames={base:'基本信息',risk:'风险分析',trend:'趋势对照',action:'执行处理',products:'产品明细',platform:'平台明细',history:'操作记录',rules:'指标口径',upload:'上传文件',preview:'校验预览',notify:'通知设置'};
function drawerContentRoot(body){
 const article=[...body.children].find(n=>n.matches('article,.sd-detail,.pb-ai-drawer'));
 return article&&body.children.length===1?article:body;
}
function drawerNodeKind(node){
 const matches=s=>node.matches(s)||!!node.querySelector(s);
 const heading=(node.matches('h3,h4,summary')?node.textContent:node.querySelector('h3,h4,summary,b')?.textContent)||'';
 if(node.classList.contains('presentation-suppressed'))return null;
 if(node.matches('header,.pc-hero,.na-hero,.md-hero,.ipd-hero,.dp-detail-head,.risk-alert-header,.ai-detail-hero,.ai-handle-context,.product-detail-image,.ai-task-receipt,.sr-detail-top,.od-hero,.cw-detail-top,.qr-platform-tabs,.drawer-platform-switch,.loss-scope-tools,.qr-time-row,.pnr-time,.nt-range-picker,.nt-platforms'))return 'shared';
 if(matches('.risk-analysis,.ir-risk-facts,.qrb-business,.sb-business,.pdd-link-panel,.sd-advice,.cw-rulebox:not(details),.sr-ai-summary,.sr-ai-grid,.af-analysis,.af-impact-path,.pc-ai,.pc-verdict,.md-verdict,.na-verdict,.deviation-source-detail'))return 'risk';
 if(matches('.risk-trends,.qr-charts,.ir-sales-trend,.na-trends,.nt-chart-grid,.pnr-charts,.md-scenario,.nt-daily,.nt-daily-heading,#nt-daily-table')||node.tagName.toLowerCase()==='svg'||/趋势|两期|对照|基数/.test(heading))return 'trend';
 if(matches('.risk-handle-form,#risk-handle-form,#qr-handle-form,#ai-handle-form,.dp-form,.sr-form,.wf-form,.pc-dispatch-form,.md-actions,.na-actions,.cw-plan,.od-summary')||/处理方案|建议行动|标准化处置|执行方案|验收标准/.test(heading))return 'action';
 if(matches('.ipd-list-heading,.ipd-filters,#ipd-results,.ipd-pagination,.ipd-chain-info,.life-products-filters,.life-products-results,.life-products-pagination,#life-products-results'))return 'products';
 if(matches('.ns-detail-toolbar,.ns-platform-heading,#ns-platform-table,.ns-platform-table'))return 'platform';
 if(matches('.timeline,.dp-log,.pd-evidence,.sr-timeline,#pww-evidence,#pww-evidence-pages,#pww-evidence-note')||/操作记录|变更记录|跟进记录|项目日报/.test(heading))return 'history';
 if(node.matches('details')&&/口径|规则|说明/.test(heading))return 'rules';
 if(node.matches('.pww-toolbar')&&node.querySelector('.tabs'))return 'history';
 if(node.matches('.aitext,.dp-callout,.sr-callout,.sd-detail-section')||/判断|归因|风险|诊断|判定/.test(heading))return 'risk';
 return 'base';
}
function drawerProfile(body,title){
 const root=drawerContentRoot(body),project=root.matches('.project-control-detail');
 if(project)return drawerProjectProfile(root);
 if(root.matches('.kpm-grade-history'))return {root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs:[{key:'base',label:'等级变动'}]};
 const salesTabs=root.querySelector('.tabs:has([data-salesview])');
 if(salesTabs)return drawerSalesProfile(root,salesTabs);
 const units=[];
 for(const node of root.children){
  // 双栏混合内容拆开控制，原父容器仍保留网格布局和委托事件。
  if(node.matches('.sr-evidence'))units.push(...node.children);
  else units.push(node);
 }
 const entries=units.map(node=>({node,key:drawerNodeKind(node)})).filter(x=>x.key);
 const form=root.matches('form')?root:root.querySelector(':scope > form');
 // 独立任务表单内仅把通知单独展示，字段始终留在同一个 form 内。
 if(form&&form.id==='ai-handle-form'){
  const whole=entries.find(x=>x.node===form);if(whole)entries.splice(entries.indexOf(whole),1);
  for(const node of form.children)entries.push({node,key:node.matches('.ai-ding-box')?'notify':'base'});
 }
 if(/导入/.test(title)&&root.querySelector('.cw-import-files')){
  entries.forEach(x=>x.key=x.node.id==='cw-preview'?'preview':'upload');
 }
 if(/任务已保存/.test(title))entries.forEach(x=>{if(x.node.matches('.ai-ding-box'))x.key='notify'});
 const groups=[...new Set(entries.map(x=>x.key).filter(k=>k!=='shared'))];
 const list=/完整榜单|全部|清单/.test(title)&&!root.matches('article')&&!root.querySelector('form,.risk-analysis');
 const order=['base','products','platform','risk','trend','action','history','rules','upload','preview','notify'];
 const tabs=order.filter(k=>groups.includes(k)).map(key=>({key,label:key==='base'?(list?'明细列表':/配置|规则/.test(title)?'配置内容':'基本信息'):drawerPaneNames[key]}));
 if(root.matches('.na-assessment,.md-diagnosis'))tabs.forEach(t=>{if(t.key==='action')t.label='经营建议'});
 if(/工作聚焦预警/.test(title))tabs.forEach(t=>{if(t.key==='history')t.label='报告记录'});
 if(root.matches('.inventory-products-detail'))tabs.forEach(t=>{if(t.key==='base')t.label='库存概览'});
 if(!tabs.length)tabs.push({key:'base',label:'基本信息'});
 return{root,entries,tabs};
}
function drawerProjectProfile(root){
 const entries=[];
 for(const node of root.children){
  let key='base';
  if(node.matches('.pc-hero'))key='shared';
  else if(node.matches('.pc-ai,.pc-verdict,.ap-detail-meta'))key='risk';
  else if(node.matches('.pc-stages,.af-section-heading'))key='tasks';
  else if(node.id==='pc-panel')key='native';
  else if(node.id==='pc-tabs')key='source-tabs';
  entries.push({node,key});
 }
 const source=root.querySelector('#pc-tabs');
 const native=[...source.querySelectorAll('button')].map(button=>({key:button.dataset.pcTab,label:button.textContent.trim(),button}));
 // 风险标签同时展示台账和分析，任务标签同时展示阶段卡与任务列表。
 const tabs=[{key:'base',label:'基本信息'},...native.map(t=>({...t,label:t.key==='risk'?'风险管理':t.label}))];
 return{root,entries,tabs,native,source};
}

function drawerSalesProfile(root,source){
 const native=[...source.querySelectorAll('[data-salesview]')].map(button=>({key:button.dataset.salesview,label:button.textContent.trim(),button}));
 const entries=[...root.children].map(node=>({node,key:node.contains(source)?'shared':'native'}));
 entries.push({node:source,key:'source-tabs'});
 return{root,entries,tabs:native,native,source};
}
