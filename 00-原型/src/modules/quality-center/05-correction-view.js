const qcCostState={type:'new',mode:'month',date:'',category:'all',metric:'',page:1};
const qcCostTitles={new:'新品整改',old:'老品整改'};

function qcCostBars(title,items,counts){
 const max=Math.max(1,...items.map(([key])=>counts[key].length));
 return `<article class="qc-cost-chart"><h3>${title}</h3><div class="qc-cost-bars">${items.map(([key,label])=>{
  const count=counts[key].length;
  return `<button type="button" class="qc-cost-bar" data-qc-cost-metric="${key}" aria-pressed="${qcCostState.metric===key}" aria-label="查看${label}明细，${count} 项"><span class="qc-cost-bar-value">${count}</span><span class="qc-cost-bar-track" aria-hidden="true"><i style="--qc-bar:${count/max*100}%"></i></span><span>${label}</span></button>`;
 }).join('')}</div></article>`;
}

function qcCostProjectTable(rows,end){
 const headings=['产品名称','品质问题根因','整改启动时间','整改方案简述','单台 / 总整改成本（元）','实际投入（元）','实际收益（元）','整改盈亏（元）','闭环状态'];
 const body=rows.map(row=>{
  const money=qcCorrectionFinance(row,end),status=qcCorrectionStatus(row,end);
  const tone={待立项:'muted',进行中:'orange',已闭环:'muted',整改成功:'green'}[status];
  return [`<button type="button" class="link" data-qc-cost-project="${row.id}" aria-haspopup="dialog">${esc(row.product)}</button><small>${esc(row.category)}</small>`,esc(row.cause),row.started&&row.started<=end?row.started:'—',esc(row.plan),
   `${qcCorrectionMoney(row.unitCost)} / ${qcCorrectionMoney(money.totalCost)}`,qcCorrectionMoney(money.actualCost),qcCorrectionMoney(money.revenue),
   `<span class="${money.gain<0?'red':money.gain>0?'green':'muted'}">${qcCorrectionMoney(money.gain)}</span>`,`<span class="${tone}">${status}</span>`];
 });
 return table(headings,body,'cc-table qc-cost-table');
}

function qcOpenCostProject(row,end){
 const money=qcCorrectionFinance(row,end),data=[
  ['品质问题根因',esc(row.cause)],['整改方案简述',esc(row.plan)],['整改启动时间',row.started&&row.started<=end?row.started:'—'],
  ['闭环状态',qcCorrectionStatus(row,end)],['单台整改成本',qcCorrectionMoney(row.unitCost)+' 元'],['总整改成本',qcCorrectionMoney(money.totalCost)+' 元'],
  ['测试投入',qcCorrectionMoney(money.testCost)+' 元'],['预期退货率下降值',fmt(money.reduction,1)+' 个百分点'],['预期收益',qcCorrectionMoney(money.expectedRevenue)+' 元'],
  ['实际投入（增加的成本）',money.actualCost==null?'—':qcCorrectionMoney(money.actualCost)+' 元'],['实际收益',money.revenue==null?'—':qcCorrectionMoney(money.revenue)+' 元'],
  ['整改盈亏',money.gain==null?'—':qcCorrectionMoney(money.gain)+' 元']
 ];
 const points=row.started?row.trend.map((rate,index)=>({date:shiftDate(row.started,index*3-3),rate})).filter(point=>point.date<=end):[];
 openModal(row.product+' · 整改明细',`<div class="qc-cost-detail"><dl>${data.map(([key,value])=>`<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl><h3>退货率趋势</h3>${riskTrendChart(points,'rate','#287cf2','退货率趋势','%')}</div>`,true,row.category);
 const headers=$$('#dialogbody .qc-cost-detail dt');
 addMetricHelp(headers.find(node=>node.textContent==='预期收益'),'演示计算：预计销量 × 预计退货率降幅 × 单次退货损失。');
 addMetricHelp(headers.find(node=>node.textContent==='整改盈亏'),'演示计算：实际收益减实际投入。');
}

function qcCreateCostSection(){
 const section=document.createElement('section');section.id='qc-cost-benefit';section.className='section qc-cost-benefit';section.dataset.moduleSticky='';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>品质整改项目成本收益台账</h2>
  <div class="rp-group-navigation qc-cost-type-tabs" role="tablist" aria-label="整改项目类型">${Object.entries(qcCostTitles).map(([key,label])=>`<button type="button" id="qc-cost-tab-${key}" role="tab" aria-controls="qc-cost-pane-${key}" data-qc-cost-type="${key}">${label}</button>`).join('')}</div></div>
  <div class="module-header-time qc-cost-time"><div class="period-segment" role="group" aria-label="整改台账时间粒度">${qcCorrectionAxes.map(([key,label])=>`<button type="button" data-qc-cost-mode="${key}">${label}</button>`).join('')}</div>
   <input type="date" aria-label="整改台账统计日期" data-qc-cost-date></div></div><div class="qc-cost-body"></div>`;
 addMetricHelp(section.querySelector('h2'),'表中数值用于样例展示。计划、实际立项和闭环按对应日期计数。进行中取选定期间末仍在执行的项目。点击柱形可查看对应项目。');
 const host=section.querySelector('.qc-cost-body');
 const typeTabs=section.querySelectorAll('[data-qc-cost-type]'),timeButtons=section.querySelectorAll('[data-qc-cost-mode]'),dateInput=section.querySelector('[data-qc-cost-date]');
 const categories=['all',...new Set(qcCorrectionSamples.map(row=>row.category))].filter(key=>key==='all'||qcIncludesChain('cost-benefit',key));
 if(!categories.includes(qcCostState.category))qcCostState.category='all';
 function paint(){
  const today=dashboardSyncDate();qcCostState.date||=today;
  const {type,category,mode,date,metric}=qcCostState;
  for(const button of typeTabs)pcSetPersonnelTab(button,button.dataset.qcCostType===type);
  for(const button of timeButtons)button.setAttribute('aria-pressed',String(button.dataset.qcCostMode===mode));
  dateInput.max=today;dateInput.value=date;
  const range=qcCorrectionRange(mode,date),end=range[1]<today?range[1]:today;
  const data=qcCorrectionScope(type,category,[range[0],end]);
  const items=(metric?data.groups[metric]:data.rows).slice().sort((a,b)=>(b.started||b.planned).localeCompare(a.started||a.planned));
  const page=pcPersonnelPage(items,qcCostState.page,'qc-cost-pager');qcCostState.page=page.current;
  const filterTitle=qcCorrectionStatuses.find(([key])=>key===metric)?.[1];
  host.innerHTML=`<div id="qc-cost-pane-${type}" role="tabpanel" aria-labelledby="qc-cost-tab-${type}">
   <div class="tabs qc-cost-category-tabs" role="group" aria-label="整改台账类目">${categories.map(key=>`<button type="button" data-qc-cost-category="${esc(key)}" aria-pressed="${key===category}" class="${key===category?'active':''}">${esc(key==='all'?'全部类目':key)}</button>`).join('')}</div>
   <div class="qc-cost-charts">${qcCostBars('立项与执行',qcCorrectionStatuses.slice(0,3),data.groups)}${qcCostBars('整改闭环与成功',qcCorrectionStatuses.slice(3),data.groups)}</div>
    <div class="qc-cost-list-heading"><h3>${filterTitle?filterTitle+'明细':'整改项目明细'} <small>${fmt(items.length)} 项</small></h3>${metric?'<button type="button" class="link" data-qc-cost-clear>查看全部项目</button>':''}</div>
    <div class="pc-data-scroll" tabindex="0" role="region" aria-label="整改项目明细">${qcCostProjectTable(page.rows,end)}</div>${page.pager}</div><div id="qc-cost-pane-${type==='new'?'old':'new'}" role="tabpanel" hidden></div>`;
  pcBindPersonnelPager(host,'qc-cost-pager',next=>{qcCostState.page=next;paint()});
 }
 function update(field,value,selector){
  qcCostState[field]=value;qcCostState.page=1;
  if(field==='type')qcCostState.metric='';
  paint();section.querySelector(selector)?.focus({preventScroll:true});
 }
 section.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  for(const field of ['type','mode','category','metric']){
   const name='data-qc-cost-'+field,value=button.getAttribute(name);
   if(value!==null){update(field,field==='metric'&&value===qcCostState.metric?'':value,`[${name}="${CSS.escape(value)}"]`);return}
  }
  if(button.hasAttribute('data-qc-cost-clear')){update('metric','','[data-qc-cost-metric]');return}
  const project=qcCorrectionSamples.find(row=>row.id===button.dataset.qcCostProject);
  if(project&&qcIncludesChain('cost-benefit',project.category)){const end=qcCorrectionRange(qcCostState.mode,qcCostState.date)[1];qcOpenCostProject(project,end<dashboardSyncDate()?end:dashboardSyncDate())}
 });
 dateInput.addEventListener('change',()=>{
  if(dateInput.value&&dateInput.checkValidity())update('date',dateInput.value,'[data-qc-cost-date]');
  else dateInput.value=qcCostState.date;
 });
 section.addEventListener('keydown',qcTabKeys);
 paint();return section;
}
