

// Supplier lifecycle risk observations share supplier IDs, periods and the procurement task store.
const svTabs=['供应商数量不达标预警','供应商引入延期预警','供应商信息缺失预警','劣质供应商预警','综合能力风险预警'];
const svState={tab:0,page:1,filters:{},status:'open',role:'manager',buyer:pbPeople[0],context:'director'};
pbStore.supplierRisk??={reviews:{},refreshes:[],seeded:[]};
const svData=()=>pbStore.supplierRisk;
const svDays=(a,b)=>Math.max(0,Math.round((Date.parse(a)-Date.parse(b))/86400000));
const svContextPeriod=()=>svState.context==='procurement'?pbPeriod('suppliers'):localPeriods.suppliers||globalPeriod;
const svWith=fn=>svState.context==='procurement'?pbWith('suppliers',fn):withPeriod('suppliers',fn);
const svKey=(suffix)=>'SR-'+(suffix.startsWith('q-new-')?periodKey():periodFor().year)+':'+suffix;
function svLedger(){return pbSupplierLedger().filter(s=>s.state!=='已淘汰').map((s,i)=>({...s,brand:brands[i%5],category:['扫地机器人','破壁机','循环扇','吹风机'][s.chain],material:['电机','电池','电源线','线路板'][Math.floor(i/8)%4],core:i%3===0,strategic:s.state==='已合作'&&i%13===0}));}
function svDelayLevel(days,impact){return impact||days>10?'高危':days>=3?'中风险':'一般提醒';}
function svTrigger(r,v=r.value){if(r.categoryId===0||r.categoryId===3)return +v<r.target;if(r.categoryId===1||r.categoryId===2)return +v>0;return r.direction==='below'?+v<r.target:r.direction==='above'?+v>r.target:+v>=r.target;}
function svObservations(){
 const b=bounds(),rows=[],ledger=svLedger(),projectList=projects();
 const add=(s,cat,id,extra)=>{const pr=projectList.filter(p=>p.chain===s.chain)[Math.abs(s.id||0)%Math.max(1,projectList.filter(p=>p.chain===s.chain).length)];rows.push({...s,originalState:s.state,supplierType:s.kind?'物料':'整机',kind:'supplier-risk',supplierKey:s.key,supplier:s.name,key:svKey(id),categoryId:cat,dimension:svTabs[cat],projectId:pr?.id,project:pr?pr.name+' '+pr.model:'供应商体系建设',date:b.cutoff,due:shiftDate(b.cutoff,7),department:'采购部',source:'供应商台账 / 采购目标 / 节点评审 · 演示快照',...extra});};
 rows.push(...scQuantityObservations(ledger));
 ledger.forEach((s,i)=>{
 const stage=['意向储备','准入储备','合作落地'][i%3],delay=i%5===0?13+i%7:i%5===1?5:i%5===2?2:0,actual=i%4===0&&s.state!=='已合作'?'未完成':shiftDate(b.cutoff,-i%6),targetDate=shiftDate(actual==='未完成'?b.cutoff:actual,-delay);
 add(s,1,'delay-'+s.key,{name:s.name,stage,value:delay,target:0,metric:delay+' 天',targetDate,actualDate:actual,impactLaunch:i%11===0&&delay>0,level:svDelayLevel(delay,i%11===0&&delay>0),rule:'实际完成 > 目标完成；未完成按快照日计延期',issue:stage+'节点延期 '+delay+' 天；'+(i%11===0?'影响项目上线窗口。':'压缩后续评审与量产准备时间。')});
 if(['意向储备','准入储备','已合作'].includes(s.state)){
 const missing=[...s.missing,...(i%9===0?['合作意向单','意向储备供应商评估表']:[]),...(i%14===0?['产品落地保障协议','模具协议']:[]),...(i%8===0?['联系人手机号']:[])],unique=[...new Set(missing)],critical=unique.some(n=>/协议|资质/.test(n));
 add(s,2,'info-'+s.key,{name:s.name,value:unique.length,target:0,missing:unique,missingType:unique.some(n=>/协议|意向单|评估表/.test(n))?'必备合同缺失':'必填信息缺失',metric:unique.length+' 项',level:critical?'高危':'中风险',rule:'适用必填信息或必备合同任缺一项即预警',issue:'待补全：'+unique.join('、')+'。'});
 add(s,3,'star-'+s.key,{name:s.name,value:s.stars,target:2,metric:s.stars+' 星',level:s.state==='已合作'||s.core?'高危':'中风险',rule:'动态评级 < 2 星',issue:'动态星级 '+s.stars+' 星；交付排期和品质稳定性需要专项复核。'});
 }
 const vals=[s.delivery,s.costRate,s.quality,s.delay,s.refurb,s.contract?1:0,s.qualified,s.missing.length],targets=[90,90,.5,0,90,0,3,0],directions=['below','below','atleast','above','below','above','below','above'],units=['%','%','%','天','%','次','家','项'];
 pbSupplierDimensions.forEach((dim,j)=>add(s,4,'ability-'+s.key+'-'+j,{name:s.name,dimension:dim,value:vals[j],target:targets[j],direction:directions[j],unit:units[j],abilityIndex:j,metric:vals[j]+units[j],level:s.stars===1||[2,5,7].includes(j)?'高危':'中风险',rule:dim+' '+({below:'<',above:'>',atleast:'≥'}[directions[j]])+targets[j]+units[j],issue:['交付及时率不足，排产与到货验收未对齐。','目标成本达标率不足，需拆解报价结构。','抽检问题比例达到预警线。','研发打样节点延期。','翻新交付承诺达成率不足。','存在合同履约异常。','合格工厂储备不足。','必备资料未归档。'][j]}));
 });return rows;
}
function svPermission(r){return svState.role==='manager'||svState.role==='buyer'&&(r.owner===svState.buyer||pbTask(r)?.owner===svState.buyer);}
function svAll(){const candidates=svObservations().filter(r=>svTrigger(r)),cutoff=bounds().cutoff;pbStore.tasks.filter(t=>t.source?.kind==='supplier-risk'&&(t.source.categoryId!==0||['category-v2','project-v1'].includes(t.source.ruleVersion))&&t.period.year===periodFor().year&&t.createdDate<=cutoff&&t.state==='已验收').forEach(t=>{if(!candidates.some(r=>r.key===t.key))candidates.push(t.source)});return candidates.map(r=>{const found=pbTask(r),t=found?.createdDate<=cutoff?found:null,review=svData().reviews[r.key],closed=t?.state==='已验收'&&!!review&&t.closedDate<=cutoff,overdue=!!t&&!closed&&t.due<cutoff;return {...r,date:t?.source.date||r.date,baseLevel:r.level,level:overdue?'高危':r.level,overdue,closed,state:closed?'已闭环':t?.state==='已验收'?'执行中':t?.state||'待下发',taskId:t?.id,owner:t?.owner||r.owner,closedDate:t?.closedDate,review};}).sort((a,b)=>(b.overdue-a.overdue)||(b.level==='高危')-(a.level==='高危')||(b.gap||0)-(a.gap||0));}
function svScoped(rows=svAll()){return rows.filter(r=>svState.role==='other'||svPermission(r)).filter(r=>svState.context!=='procurement'||pbScope(r)).filter(r=>Object.entries(svState.filters).every(([k,v])=>!v||v==='all'||String(r[k])===v));}
function svStatusRows(rows){return rows.filter(r=>svState.status==='closed'?r.closed&&r.closedDate>=bounds().start&&r.closedDate<=bounds().cutoff:svState.status==='red'?!r.closed&&r.level==='高危':svState.status==='progress'?!r.closed&&!!r.taskId:svState.status==='overdue'?r.overdue:!r.closed);}
function svStats(rows){const active=rows.filter(r=>!r.closed);return [active.length,active.filter(r=>r.level==='高危').length,active.filter(r=>r.taskId).length,rows.filter(r=>r.closed&&r.closedDate>=bounds().start&&r.closedDate<=bounds().cutoff).length,active.filter(r=>r.overdue).length];}
function svAI(r){const cause=[['开发资源分散、供方准入转化慢','为该品类配置 1 名开发采购；品质部预留验厂档期；必要时申请样机与模具共担政策。','核实候选清单 → 商务与技术初筛 → 验厂及准入评审 → 回写储备池'],['资料往返、验厂整改及采购跟进未形成明确节点','采购逐日跟进，品质部优先安排复验；项目经理确认上线窗口及备选路径。','确认延期关键路径 → 补齐前置资料 → 加急评审与复验 → 验证落地确认'],['提交与归档责任不清，流程缺少必填校验','指定资料专员跟进；核心合同由法务审核，资质由品质部复核。','按缺失清单催补 → 有效性与签章核验 → 系统归档 → 采购与法务交叉验证'],['产能或质量稳定性下降，低星级问题未及时纠偏','品质工程师驻点复核异常；开发采购同步准备备选供应商，避免直接断供。','评估交付 / 品质差距 → 分批整改与复测 → 持续评级 → 替换或恢复份额'],['业务台账与承诺目标偏离，问题需按能力维度拆解','责任采购联合品质、研发与法务确认影响边界，优先保障关键物料与核心项目。','核对指标分子分母 → 识别异常批次与责任节点 → 定向整改 → 复算指标并验收']][r.categoryId];
 return {cause:cause[0],resource:cause[1],plan:cause[2],impact:r.categoryId===0?'影响 '+r.project+' 的供方选择与议价空间，储备缺口 '+r.gap+' 家。':r.categoryId===1?r.stage+'延期 '+r.value+' 天；'+(r.impactLaunch?'已影响项目上线，应优先协调资源。':'存在后续评审和交付顺延风险。'):r.categoryId===2?'缺失 '+r.value+' 项，可能影响准入、合同责任认定与合作保障。':r.categoryId===3?'当前 '+r.value+' 星，需防范交付中断、批次质量波动。':r.dimension+'异常，关联 '+r.project+' 的业务稳定性。',criteria:r.categoryId===0?'经审核有效供应商数量 ≥ '+r.target+' 家，并附供应商编码及准入证据。':r.categoryId===1?'延期节点完成并确认下游恢复计划，实际完成时间及评审凭证齐全。':r.categoryId===2?'缺失项全部补齐，必填信息有效，合同签章与附件可核验。':r.categoryId===3?'完成复评，动态星级 ≥ 2 星，附复评报告。':'复测指标不再命中「'+r.rule+'」，附同口径业务台账。'};
}
// These integrations use risk-item keys: accepting one task cannot hide sibling warnings.
const svPreviousSupplierRisks=pbSupplierRisks;pbSupplierRisks=function(){return svAll().filter(r=>!r.closed&&pbScope(r)&&svPermission(r));};
const svPreviousRank=pbSupplierRankRows;pbSupplierRankRows=function(rows){return rows.some(r=>r.kind==='supplier-risk')?rows:svPreviousRank(rows);};
const svPreviousAIRows=pbAIRows;pbAIRows=function(){const old=svPreviousAIRows().filter(r=>r.kind!=='supplier-risk');return [...pbSupplierRisks().map(r=>({...r,priority:r.level==='高危'?'P0':'P1'})),...old].sort((a,b)=>a.priority.localeCompare(b.priority));};
const svPreviousPlan=pbPlan;pbPlan=function(r){return r.kind==='supplier-risk'?svAI(r).plan+'。\n'+svAI(r).resource:svPreviousPlan(r);};
// Verified business outcomes are reflected in supplier assessments, as of the selected cutoff.
const svPreviousLedger=pbSupplierLedger;pbSupplierLedger=function(){return svPreviousLedger().map(s=>{let result={...s};pbStore.tasks.filter(t=>t.source?.kind==='supplier-risk'&&t.source.supplierKey===s.key&&t.state==='已验收'&&t.closedDate<=bounds().cutoff&&svData().reviews[t.key]).forEach(t=>{if(t.source.categoryId===3)result.stars=t.resultValue;if(t.source.categoryId===2)result.missing=[];if(t.source.categoryId===4){const field=['delivery','costRate','quality','delay','refurb','contract','qualified','missing'][t.source.abilityIndex];result[field]=field==='missing'?[]:field==='contract'?false:t.resultValue;}});return result;});};
const svPreviousScope=pbScope;pbScope=function(r){return svPreviousScope(r)&&(svState.role==='manager'||svState.role==='buyer'&&r.owner===svState.buyer);};

function svButton(label,action,key='',cls='link'){return `<button type="button" class="${cls}" data-sr-action="${action}" data-sr-key="${esc(String(key))}">${label}</button>`;}
function svSelect(label,key,items,value=svState.filters[key]||'all'){return `<label>${label}<select data-sr-filter="${key}"><option value="all">全部</option>${items.map(([v,n])=>`<option value="${esc(String(v))}" ${String(v)===value?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;}
function svLevel(r){return `<span class="tag ${r.closed?'green':r.level==='高危'?'red':r.level==='中风险'?'orange':'blue'}">${r.closed?'已闭环':r.level==='高危'?'● 红灯':r.level==='中风险'?'● 黄灯':'一般提醒'}</span>${r.overdue?'<small class="red">整改逾期 · 已升级</small>':''}`;}
function svOperation(r){return svButton('查看详情','detail',r.key)+svButton(r.taskId?'跟进整改':'一键下发','task',r.key);}
function svColumns(tab){return [
 ['预警等级','预警类型','供应商类型','产品链群 / 品牌','对应项目','当前数量','目标数量','缺口数量','责任采购','触发条件项','操作'],
 ['预警等级','延期阶段','供应商名称','供应商类型','产品链群','对应项目','目标完成','实际完成','延期天数','责任采购','操作'],
 ['预警等级','缺失类型','供应商名称','供应商类型','供应商状态','缺失项明细','缺失数量','责任采购','操作'],
 ['预警等级','供应商名称','供应商类型','供应商状态','当前星级','所属品类','责任采购','风险影响','操作'],
 ['预警等级','供应商名称','能力维度','当前值 / 阈值','供应商类型 / 状态','所属品类 / 品牌','责任采购','风险说明','操作']][tab];}
function svCells(r){const base=[
 [svLevel(r),esc(r.name),r.supplierType,chains[r.chain]+'<small>'+r.category+' / '+r.brand+(r.material?' · '+r.material:'')+'</small>',esc(r.project),r.value+' 家',r.target+' 家',`<b class="red">${r.gap} 家</b>`,r.owner,esc(r.rule)],
 [svLevel(r),r.stage,esc(r.name),r.supplierType,chains[r.chain]+'<small>'+r.category+'</small>',esc(r.project),r.targetDate,r.actualDate,`<b class="red">${r.value} 天</b>`,r.owner],
 [svLevel(r),r.missingType,esc(r.name),r.supplierType,r.supplierState||r.stateSource||r.originalState||'—',esc((r.missing||[]).join('、')),r.value+' 项',r.owner],
 [svLevel(r),esc(r.name),r.supplierType,r.supplierState||r.originalState||'—',`<b class="red">${r.value} 星</b>`,chains[r.chain],r.owner,'交付风险 / 品质风险'],
 [svLevel(r),esc(r.name),r.dimension,r.metric+'<small>预警：'+r.rule+'</small>',r.supplierType+'<small>'+r.originalState+'</small>',chains[r.chain]+'<small>'+r.brand+'</small>',r.owner,esc(r.issue)]
 ][r.categoryId];return [...base,`<div class="sr-row-actions">${svOperation(r)}</div>`];}
function svRiskList(rows,modal=false){const tab=svState.tab,view=rows.filter(r=>r.categoryId===tab),size=listPageSize('sv-risks',modal?20:10),max=Math.max(1,Math.ceil(view.length/size));svState.page=Math.min(Math.max(1,svState.page),max);return `<div class="sr-list-heading"><b>${svTabs[tab]}</b><span>共 ${view.length} 项 · ${svState.status==='closed'?'已闭环历史':'按红灯、逾期优先展示'}</span></div><div class="sr-table">${dpTable(svColumns(tab),view.slice((svState.page-1)*size,svState.page*size).map(svCells))}</div>${!view.length?'<div class="dp-empty">当前筛选范围暂无预警</div>':''}${listPager(view.length,svState.page,size,{sizeKey:'sv-risks',attr:'data-sr-key',extra:{'data-sr-action':'page'}})}`;}