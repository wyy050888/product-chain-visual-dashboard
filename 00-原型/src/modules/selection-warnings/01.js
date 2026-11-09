

// Selection warnings share project/sample ledgers and the procurement risk period.
const pswTypes=['项目延期预警（自选品）','选品数预警'],pswStages=[0,2,3,4,5];let pswSelected=0;
function pswRows(includeNormal=false){
 const b=bounds(),out=[];
 for(const p of pbProjectRows().filter(p=>/选品/.test(p.type))){
  if(!p.plan||p.plan<b.start||p.plan>b.cutoff)continue;
  const actual=p.actual&&p.actual!=='—'&&p.actual<=b.cutoff?p.actual:null,cancel=p.cancelDate&&p.cancelDate<=b.cutoff?p.cancelDate:null;
  const end=cancel||actual||b.cutoff,delay=Math.max(0,Math.round((Date.parse(end)-Date.parse(p.plan))/86400000));
  if(!includeNormal&&delay<=0)continue;
  out.push({...p,key:'SELF-PROJECT-'+periodKey()+'-'+p.id,kind:'self-project-warning',warningType:0,confirmed:p.confirmedDate||shiftDate(p.plan,-45),initiated:p.initiatedDate||shiftDate(p.plan,-35),cancel,delay,metric:delay+' 天',level:delay>10?'高危':'中风险',date:b.cutoff,due:shiftDate(b.cutoff,7),issue:p.cause||p.stage||'上线节点延期',source:'选品项目台账 · 测试数据（确品、立项时间为演示节点）'});
 }
 const samples=pbSamples();
 for(let chain=0;chain<4;chain++){
  if(pbState.chain!=='all'&&chain!==+pbState.chain)continue;
  const owners=pbPeople.filter((_,i)=>i%4===chain);
  const targets=pswStages.map(stage=>splitTarget(pbState.chain==='all'?splitTarget(pbSelectionTarget(stage),[1,1,1,1])[chain]:pbSelectionTarget(stage),[1,1,1]));
  owners.forEach((owner,i)=>{
   const own=samples.filter(s=>s.owner===owner),scope={chain,owner,tier:own[0]?.tier??0};if(!pbScope(scope))return;
   const counts=pswStages.map((stage,j)=>{const target=targets[j][i],actual=pbStageRows(stage,own).length;return {stage,target,actual,deviation:actual-target};}),missing=counts.filter(c=>c.deviation<0);
   if(!includeNormal&&!missing.length)return;
   out.push({...scope,key:'SELF-COUNT-'+periodKey()+'-'+owner,kind:'self-count-warning',warningType:1,name:owner+' · 选品数量',counts,metric:missing.length+' 项未达标',level:missing.some(c=>c.actual<c.target*.6)?'高危':'中风险',date:b.cutoff,due:b.end,issue:missing.map(c=>pbStages[c.stage]+'缺 '+(-c.deviation)+' 项').join('；')||'各环节已达标',source:'选品台账 / 周期目标 · 测试数据'});
  });
 }
 return out.sort((a,b)=>a.warningType-b.warningType||(a.warningType===0?b.delay-a.delay:b.counts.filter(c=>c.deviation<0).length-a.counts.filter(c=>c.deviation<0).length));
}
function pswOptions(){return pswTypes.map((t,i)=>`<option value="${i}" ${i===pswSelected?'selected':''}>${t}</option>`).join('');}
function pswHeads(type){return type===0?['采购人员','产品链群','产品名称 / 型号','确品时间','立项时间','计划上线时间','延期时长','取消时间','卡点','操作']:['采购人员',...pswStages.map(s=>pbStages[s]+'数量'),'操作'];}
function pswDeviation(c){return (c.deviation>0?'+':'')+c.deviation;}
function pswCells(r){return r.warningType===0?[esc(r.owner),esc(chains[r.chain]),pbProduct(r),r.confirmed,r.initiated,r.plan,`<strong class="red">${r.delay} 天</strong>`,r.cancel||'未取消',esc(r.stage||r.issue),pbBtn('查看详情','detail',r.key)]:[esc(r.owner),...r.counts.map(c=>`<div class="psw-count"><span>目标 <b>${c.target}</b></span><span>实际 <b>${c.actual}</b></span><span class="${c.deviation<0?'red':'green'}">偏差 <b>${pswDeviation(c)}</b></span></div>`),pbBtn('查看详情','detail',r.key)];}

function pswOpen(context={period:{...pbPeriod('risk')}}){pbModalSection='risk';const all=pnrRun(context,()=>pswRows().filter(r=>!pbClosed(r)));const productFilters=pfDefaults();let page=1;
 openModal('自选品预警 · 全部',`<div class="br-list-tools"><label>预警类型 <select id="psw-type">${pswOptions()}</select></label><span class="note">${periodLabel(context.period)} · 截至 ${bounds(context.period).cutoff} · 测试数据</span></div><div id="psw-table"></div><div id="psw-pages"></div><details class="psw-rules"><summary>指标口径</summary><p>项目延期：计划上线日期在所选周期内，实际完成（未完成取统计截止日，已取消取取消日）晚于计划上线日期。确品、立项日期采用演示节点。</p><p>选品数：按各节点完成日期统计所选周期实际数量；周期目标按品类、采购人员分配。偏差＝实际−目标，负数表示未达标。五个节点分别统计，同一产品可进入多个节点。</p></details>`,false,'采购部高危预警');$('#dialog').classList.add('psw-dialog');
 function fill(){const rows=all.filter(r=>r.warningType===pswSelected&&(Array.isArray(r.counts)||pfMatches(r,productFilters))),pages=Math.max(1,Math.ceil(rows.length/listPageSize('psw-pages',20)));page=Math.min(page,pages);pnrRun(context,()=>rows.forEach(pbRemember));$('#psw-table').innerHTML=rows.length?table(pswHeads(pswSelected),rows.slice((page-1)*listPageSize('psw-pages',20),page*listPageSize('psw-pages',20)).map(pswCells)):'<div class="empty">当前周期及范围暂无此类预警</div>';$('#psw-table').className=pswSelected===0?'psw-project-table':'psw-count-table';$('#psw-table').querySelectorAll('table').forEach(rdTable);mountListPager($('#psw-pages'),rows.length,page,next=>{page=next;fill()});$('#psw-table').onclick=e=>{const btn=e.target.closest('[data-pb-action="detail"]');if(!btn)return;e.stopPropagation();pswDetail(rows.find(r=>r.key===btn.dataset.key),context);};}
 pfMount($('#psw-type').closest('.br-list-tools'),productFilters,()=>{page=1;fill()});$('#psw-type').onchange=e=>{pswSelected=+e.target.value;page=1;fill();renderPurchasing()};fill();
}
function pswDetail(r,context={period:{...pbPeriod('risk')}}){if(!r)return;pbModalSection='risk';const project=r.warningType===0;
 const body=project?`<div class="dp-detail-head psw-hero">${riskThumbnail(r.name)}<div><h3>${esc(r.name)}</h3><small>${esc(r.model)} · ${esc(chains[r.chain])} · 采购人员 ${esc(r.owner)}</small></div><strong class="red">延期 ${r.delay} 天</strong></div>${table(['确品时间','立项时间','计划上线时间','实际上线时间','取消时间'],[[r.confirmed,r.initiated,r.plan,r.actual&&r.actual!=='—'?r.actual:'未上线',r.cancel||'未取消']])}<div class="psw-rules"><b>卡点：${esc(r.stage||'上线节点')}</b><p>${esc(r.issue)}</p></div>`:`<div class="psw-hero"><h3>${esc(r.owner)} · 选品数量</h3><span>${esc(chains[r.chain])} · ${esc(r.metric)}</span></div>${table(['选品环节','目标数量','实际数量','偏差数量'],r.counts.map(c=>[pbStages[c.stage],c.target,c.actual,`<strong class="${c.deviation<0?'red':'green'}">${pswDeviation(c)}</strong>`]))}<p class="note">偏差＝实际−目标；负数表示未达标。</p>`;
 openModal(project?r.name+' · 自选品延期详情':r.owner+' · 选品数预警详情',body,false,periodLabel(context.period)+' · 截至 '+bounds(context.period).cutoff+' · 测试数据');$('#dialog').classList.add('psw-dialog');$('#dialogbody').querySelectorAll('table').forEach(rdTable);$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" id="psw-back">返回榜单</button><button class="btn primary" id="psw-dispatch">'+(pbTask(r)?'跟进任务':'下发任务')+'</button>');$('#psw-back').onclick=()=>pswOpen(context);$('#psw-dispatch').onclick=()=>pnrRun(context,()=>{pbRemember(r);pbDispatch(r)});
}
const pswPreviousLists=pbRiskLists;pbRiskLists=function(includeClosed=false){const lists=pswPreviousLists(includeClosed);lists[5]=pswRows().filter(r=>includeClosed||!pbClosed(r));lists[5].forEach(pbRemember);return lists;};
const pswPreviousOpen=pbOpenRiskList;pbOpenRiskList=function(index){return index===5?pswOpen():pswPreviousOpen(index);};
const pswPreviousDetail=pbDetails;pbDetails=function(r){return r&&['self-project-warning','self-count-warning'].includes(r.kind)?pswDetail(r):pswPreviousDetail(r);};
const pswPreviousRender=pbRenderRisk;pbRenderRisk=function(){const root=document.createElement('div');root.innerHTML=pswPreviousRender();const card=root.querySelectorAll('.riskcard')[5],rows=pswRows().filter(r=>r.warningType===pswSelected&&!pbClosed(r));if(card)card.innerHTML=`<div class="rhead"><h3><i class="riskbadge"></i>自选品预警</h3>${pbBtn('全部 '+rows.length+' ›','risk-list',5)}</div><div class="sw-rank-filter"><select data-psw-rank aria-label="自选品预警类型">${pswOptions()}</select></div>${rows.slice(0,6).map((r,i)=>`<button class="sw-rank-row" data-pb-action="detail" data-key="${esc(pbRemember(r))}"><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span><span class="pb-rank-product">${r.warningType===0?riskThumbnail(r.name):''}<span class="sw-rank-name">${esc(r.warningType===0?r.name:r.owner)}<small>${esc(r.warningType===0?r.model:chains[r.chain])}</small></span></span><span class="sw-rank-value">${r.metric}</span></button>`).join('')||'<div class="empty">当前范围暂无预警</div>'}`;return root.innerHTML;};pbRenderers.risk=pbRenderRisk;
document.addEventListener('change',e=>{if(e.target.hasAttribute('data-psw-rank')){pswSelected=+e.target.value;renderPurchasing()}});
const pswPreviousModal=openModal;openModal=function(...args){$('#dialog').classList.remove('psw-dialog');return pswPreviousModal(...args);};