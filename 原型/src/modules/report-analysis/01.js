

// Local demo report analysis: derive every count from selected work records.
const wfState={tab:'missing',department:'全部',role:'全部',person:'全部',page:1,key:''};
const wfTabs=[['focus','工作聚焦'],['resources','资源占用'],['collaboration','产品协同'],['omission','工作遗漏'],['missing','缺少方案'],['issues','协同问题']];
const wfRoles=['产品经理','项目经理','品质工程师','研发工程师','采购经理'];
const wfStaff=depts.flatMap((department,d)=>[0,1,2,3].map(j=>({name:people[(d*4+j)%people.length],department,role:wfRoles[d]})));
const wfProducts=Array.from({length:20},(_,i)=>({id:'WF-'+i,name:names[i%4][Math.floor(i/4)%6],model:sampleSpuIdentity(i%4,Math.floor(i/4),false).model,chain:chains[i%4],block:['电机温升验证未通过','首批物料齐套不足','退货问题复测未闭环','需求变更未完成评审','试产排期未确认'][i%5],coordinator:aiOwners[i%4],issue:['交接未确认','责任边界不清','验收标准不一致','无异常'][i%4],solution:i%5===0?null:{action:'组织'+['温升复测','物料补齐','退货原因复测','需求复审','试产排期确认'][i%5],owner:i%5===1?'':aiOwners[i%4],due:'2026-09-20',acceptance:i%5===1?'':'提交复核报告并由链主验收'}}));
const wfStorageKey='dashboard-work-focus-v1';
let wfLocal={reports:[],actions:{}};
try{const saved=JSON.parse(localStorage.getItem(wfStorageKey)||'null');if(saved&&Array.isArray(saved.reports)&&saved.actions&&typeof saved.actions==='object')wfLocal=saved}catch(_){}
const wfBaseWork=[],wfBaseReports=[];
for(let date=aiCoverageStart;date<=aiCutoff;date=shiftDate(date,1)){
 if([0,6].includes(new Date(date+'T00:00:00Z').getUTCDay()))continue;
 for(let i=0;i<wfProducts.length;i++)for(let j=0;j<3;j++){
  if(j===1&&i%3===0)continue;
  const person=wfStaff[(i+j*4)%wfStaff.length],product=wfProducts[i],id=product.id+'|'+date+'|'+person.name;
  wfBaseWork.push({id,productId:product.id,date,...person,hours:1.5+(i+j)%5*.5,blocked:j!==2,task:j===2?'常规资料整理':product.block,result:j===2?'完成资料归档':'已跟进，卡点仍待复核；'+({交接未确认:'未附接收方确认记录',责任边界不清:'未明确唯一交付负责人',验收标准不一致:'岗位验收口径尚未对齐',无异常:'交接与责任已确认'}[product.issue]),solution:product.solution});
 }
}
const wfDailyGroups=new Map();for(const w of wfBaseWork){const key=w.date+'|'+w.name;const a=wfDailyGroups.get(key)||[];a.push(w);wfDailyGroups.set(key,a)}
for(const [key,works] of wfDailyGroups)wfBaseReports.push({id:'DR-'+key,type:'daily',author:works[0].name,submitted:works[0].date,workIds:works.map(w=>w.id),title:works[0].name+' · 工作日报'});
const wfWeeklyGroups=new Map();for(const w of wfBaseWork){const day=(new Date(w.date+'T00:00:00Z').getUTCDay()+6)%7,key=shiftDate(w.date,-day)+'|'+w.name;const a=wfWeeklyGroups.get(key)||[];a.push(w);wfWeeklyGroups.set(key,a)}
for(const [key,works] of wfWeeklyGroups)wfBaseReports.push({id:'WR-'+key,type:'weekly',author:works[0].name,submitted:works.at(-1).date,workIds:works.map(w=>w.id),title:works[0].name+' · 工作周报'});
function wfDirector(){return dpState.view==='director'&&!dxRendering}
function wfMatch(w){return (wfState.department==='全部'||w.department===wfState.department)&&(wfState.role==='全部'||w.role===wfState.role)&&(wfState.person==='全部'||w.name===wfState.person)}
function wfDataset(){
 const range=inlineAIRange(),allWorks=[...wfBaseWork,...wfLocal.reports.map(r=>r.work)],allReports=[...wfBaseReports,...wfLocal.reports.map(r=>r.report)],workMap=new Map(allWorks.map(w=>[w.id,w]));
 const eligible=new Map(allWorks.filter(w=>w.date>=range.start&&w.date<=range.end&&wfMatch(w)).map(w=>[w.id,w]));
 const reports=allReports.filter(r=>r.submitted<=aiCutoff&&r.workIds.some(id=>eligible.has(id))),ids=new Set(reports.flatMap(r=>r.workIds.filter(id=>eligible.has(id)))),works=[...ids].map(id=>workMap.get(id));
 const products=wfProducts.map(p=>{const rows=works.filter(w=>w.productId===p.id),blocked=rows.filter(w=>w.blocked),latest=rows.filter(w=>w.solution).sort((a,b)=>b.date.localeCompare(a.date)||Number(!!b.local)-Number(!!a.local))[0],solution=latest?.solution||null,missing=!solution?['具体动作','责任人','截止日','验收标准']:[['action','具体动作'],['owner','责任人'],['due','截止日'],['acceptance','验收标准']].filter(([k])=>!solution[k]).map(([,v])=>v);return {...p,works:rows,blocked,hours:rows.reduce((s,w)=>s+w.hours,0),blockHours:blocked.reduce((s,w)=>s+w.hours,0),solution,missing,departments:[...new Set(rows.map(w=>w.department))],persons:[...new Set(rows.map(w=>w.name))]}}).filter(p=>p.blocked.length);
 const omissions=[];for(const p of products){const i=+p.id.slice(3);for(let j=0;j<3;j++){const staff=wfStaff[(i+j*4)%wfStaff.length];if(wfMatch(staff)&&!p.works.some(w=>w.name===staff.name))omissions.push({...p,staff,obligation:j===1?'提交复核结论与交接确认':'反馈负责节点的进展'})}}
 const staff=[...new Set(works.map(w=>w.name))].map(name=>{const rows=works.filter(w=>w.name===name),hours=rows.reduce((s,w)=>s+w.hours,0),blockHours=rows.filter(w=>w.blocked).reduce((s,w)=>s+w.hours,0);return {...rows[0],hours,blockHours,products:new Set(rows.map(w=>w.productId)).size}});
 return {range,works,reports,products,omissions,staff,totalHours:works.reduce((s,w)=>s+w.hours,0),blockHours:works.filter(w=>w.blocked).reduce((s,w)=>s+w.hours,0),missing:products.filter(p=>!p.solution),incomplete:products.filter(p=>p.solution&&p.missing.length),issues:products.filter(p=>p.issue!=='无异常')};
}
function wfProduct(p){return `<div class="wf-product">${riskThumbnail(p.name)}<div><strong>${esc(p.name)}</strong><small>${esc(p.model)} · ${esc(p.chain)}</small><small>${esc(p.block)}</small></div></div>`}
function wfAction(p,label='安排处理'){return `<button class="link" data-wf-action="${p.id}">${label}</button>${wfLocal.actions[p.id]?'<small class="green">已存处理方案 · 待落实</small>':''}`}
function wfTable(headers,rows){return `<div class="wf-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">当前范围暂无匹配记录</td></tr>`}</tbody></table></div>`}
function wfTabRows(d){
 const product=p=>wfProduct(p),hours=p=>fmt(p.blockHours,1)+' h',coord=p=>esc(p.coordinator);
 if(wfState.tab==='resources')return {title:'岗位资源投入与卡点占用',headers:['人员 / 岗位','扫描工时','卡点投入','卡点占比','涉及产品','管理建议'],rows:d.staff.map(s=>[`${esc(s.name)}<small>${esc(s.department)} · ${esc(s.role)}</small>`,fmt(s.hours,1)+' h',fmt(s.blockHours,1)+' h',fmt(s.blockHours/s.hours*100,1)+'%',s.products+' 个',s.blockHours/s.hours<.5?'复核优先级，优先保障关键卡点':'保持关键卡点投入，跟踪交付结果'])};
 if(wfState.tab==='omission')return {title:'未扫描到责任动作的岗位事项',headers:['产品 / 卡点','责任岗位','应落实动作','判断','主责协调人','管理动作'],rows:d.omissions.map(p=>[product(p),`${esc(p.staff.name)}<small>${esc(p.staff.role)}</small>`,p.obligation,'<span class="tag red">工作遗漏风险 · 待核实</span>',coord(p),wfAction(p,'核实并补充工作记录')])};
 if(wfState.tab==='missing')return {title:'未扫描到完整解决方案的产品卡点',headers:['产品 / 卡点','判定','已投入','当前缺失','主责协调人','管理动作'],rows:[...d.missing,...d.incomplete].map(p=>[product(p),`<span class="tag ${p.solution?'orange':'red'}">${p.solution?'方案待补齐':'未扫描到方案'}</span>`,hours(p),p.solution?'缺少：'+p.missing.join('、'):'所选报告范围未出现具体解决方案',coord(p),wfAction(p,p.solution?'补齐责任与验收要求':'组织根因分析，明确方案')])};
 if(wfState.tab==='issues')return {title:'跨岗位协同问题',headers:['产品 / 卡点','协同问题','报告线索','影响','主责协调人','管理动作'],rows:d.issues.map(p=>[product(p),`<span class="tag orange">${p.issue}</span>`,{交接未确认:'已跟进卡点，接收方确认记录待补齐',责任边界不清:'责任动作分散在多个岗位，缺少统一交付责任',验收标准不一致:'多个岗位推进同一卡点，验收口径待对齐'}[p.issue],'交付与闭环存在偏差风险',coord(p),wfAction(p,'对齐协同安排')])};
 if(wfState.tab==='collaboration')return {title:'按产品汇总跨岗位协同',headers:['产品 / 卡点','参与部门','参与人员','卡点投入','协同状态','主责协调人','管理动作'],rows:d.products.map(p=>[product(p),p.departments.map(esc).join('、'),p.persons.map(esc).join('、'),hours(p),`<span class="tag ${p.issue==='无异常'?'green':'orange'}">${p.issue==='无异常'?'协同正常':p.issue}</span>`,coord(p),wfAction(p,'查看并协调')])};
 return {title:'工作投入是否聚焦产品卡点',headers:['产品 / 卡点','卡点投入','扫描工时','聚焦占比','判断','主责协调人','管理动作'],rows:d.products.map(p=>[product(p),hours(p),fmt(p.hours,1)+' h',fmt(p.blockHours/p.hours*100,1)+'%',p.blockHours/p.hours<.6?'<span class="tag orange">投入需复核</span>':'<span class="tag green">聚焦卡点</span>',coord(p),wfAction(p,'调整工作优先级')])};
}
function wfPanel(d){
 const result=wfTabRows(d),pages=Math.max(1,Math.ceil(result.rows.length/5));wfState.page=Math.min(wfState.page,pages);
 const cards=[['卡点产品',d.products.length,'跨岗位关联对象',''],['卡点投入',fmt(d.blockHours,1)+' h','占扫描工时 '+(d.totalHours?fmt(d.blockHours/d.totalHours*100,1):'0')+'%',''],['工作遗漏风险',d.omissions.length,'岗位责任项 · 待核实','red'],['未扫描到方案',d.missing.length,'另有 '+d.incomplete.length+' 项方案待补齐','orange'],['协同异常产品',d.issues.length,'含交接、责任及验收偏差','orange'],['已扫描报告',d.reports.length,'日报 '+d.reports.filter(r=>r.type==='daily').length+' · 周报 '+d.reports.filter(r=>r.type==='weekly').length,'']];
 return `<section class="wf-panel"><div class="wf-heading"><div><h3>AI 工作聚焦与协同诊断</h3><p>从日报、周报追溯产品卡点与责任动作</p></div><div><span class="tag">模拟分析</span><button class="link" data-wf-evidence>查看报告依据</button><button class="btn primary small" data-wf-report>补充日报 / 周报</button></div></div><div class="wf-kpis">${cards.map(([name,note,sub,tone])=>`<div><span>${name}</span><strong class="${tone}">${note}</strong><small>${sub}</small></div>`).join('')}</div><div class="tabs wf-tabs">${wfTabs.map(([id,label])=>`<button data-wf-tab="${id}" class="${wfState.tab===id?'active':''}" aria-selected="${wfState.tab===id}">${label}</button>`).join('')}</div><div class="wf-table-heading"><h3>${result.title}</h3>${wfState.tab==='missing'?'<small>完整方案：具体动作 + 责任人 + 截止日 + 验收标准</small>':''}</div>${wfTable(result.headers,result.rows.slice((wfState.page-1)*5,wfState.page*5))}${listPager(result.rows.length,wfState.page,5,{attr:"data-wf-page"})}<p class="wf-foot">按报告所记工作日期统计，同一工作记录只计一次工时；未扫描到动作或方案需核实。报告与诊断为模拟数据，补充记录仅保存本机。</p></section>`;
}
const wfPreviousRows=inlineAIRows;
inlineAIRows=function(){const rows=wfPreviousRows();if(!wfDirector())return rows;const d=wfDataset();return [...rows.filter(r=>r.kind!=='deviation'),...d.products.map(p=>({id:p.id,kind:'deviation',finding:'deviation',date:d.range.end,chain:p.chain,department:p.departments[0],owner:p.coordinator,level:'P1',subject:p.name}))]};
const wfPreviousRender=renderInlineAI;
renderInlineAI=function(){
 if(!wfDirector()){wfPreviousRender();if($('#ai-inline-summary'))$('#ai-inline-summary').hidden=false;return}
 const kind=aiView.kind;if(kind==='deviation')aiView.kind='block';
 try{wfPreviousRender()}finally{aiView.kind=kind}
 const card=$('[data-ai-kind="deviation"]'),d=wfDataset();card.querySelector('h3').textContent='工作聚焦与协同诊断';card.querySelector('.an').innerHTML=d.products.length+'<span>个产品</span>';card.querySelector('p').textContent='聚焦卡点投入、工作遗漏与协同问题';
 $('#ai-inline-summary').hidden=kind==='deviation';
 if(kind!=='deviation')return;
 $$('[data-ai-kind]').forEach(b=>{b.classList.toggle('selected',b.dataset.aiKind===kind);b.setAttribute('aria-pressed',String(b.dataset.aiKind===kind))});
 const key=[d.range.start,d.range.end,wfState.department,wfState.role,wfState.person].join('|');if(wfState.key!==key){wfState.page=1;wfState.key=key}
 const roles=[...new Set(wfStaff.filter(s=>wfState.department==='全部'||s.department===wfState.department).map(s=>s.role))],persons=wfStaff.filter(s=>(wfState.department==='全部'||s.department===wfState.department)&&(wfState.role==='全部'||s.role===wfState.role));
 $('.ai-dimension-filters').innerHTML=[['department','部门',depts],['role','岗位',roles],['person','人员',[...new Set(persons.map(s=>s.name))]]].map(([key,label,values])=>`<label>${label}<select data-wf-filter="${key}" aria-label="工作诊断${label}"><option value="全部">全部${label}</option>${values.map(v=>`<option ${wfState[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`).join('')+'<button class="link" data-wf-reset>重置筛选</button>';
 $('#aitime').textContent='从日报、周报追溯产品卡点与责任动作';$('#ai-inline-details').innerHTML=wfPanel(d);$('#ai-inline-foot').textContent='报告范围 '+d.range.start+' — '+d.range.end+' · 已提交报告截至 '+aiCutoff+' · 按工作日期统计';
};
renderAI=renderInlineAI;
function wfSave(){try{localStorage.setItem(wfStorageKey,JSON.stringify(wfLocal));return true}catch(_){return false}}