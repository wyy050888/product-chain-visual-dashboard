

// Imported cost records remain separate from demonstration order data.
const CW_KEY='procurement-cost-import-v1';
let cwStore={records:[],batches:[]};try{const saved=JSON.parse(localStorage.getItem(CW_KEY)||'null');if(saved&&Array.isArray(saved.records)&&Array.isArray(saved.batches))cwStore=saved;}catch(_){}
const cwTypes=['超目标成本预警','降本进度滞后预警','模具费分摊完毕预警','翻新费用预警','大额波动预警'];
const cwField=(key,label,type='text',required=true)=>({key,label,type,required});
const cwCommon=[cwField('id','记录编号'),cwField('date','数据日期','date'),cwField('chainName','所属品链'),cwField('owner','采购人员'),cwField('category','产品链群'),cwField('productType','产品类型'),cwField('productCode','SPU码'),cwField('name','产品名称','text',false),cwField('model','产品型号','text',false),cwField('image','产品图片','image',false)];
const cwRates=['装配费率','管理费率','利润率','税费率'];
const cwFields=[
 [...cwCommon,cwField('supplier','供应商名称'),cwField('stage','报价阶段'),cwField('target','目标成本','number'),cwField('actual','实际成本','number'),...cwRates.flatMap((n,i)=>[cwField('targetRate'+i,'目标'+n,'percent'),cwField('actualRate'+i,'实际'+n,'percent')])],
 [...cwCommon,cwField('supplier','供应商名称'),cwField('sealed','封样报价','number'),cwField('cut','单台累计降价额','number'),cwField('quarterSaving','季度累计降本额','number'),cwField('yearSaving','年度累计降本额','number'),cwField('yearTarget','年度降本目标额','number')],
 [...cwCommon,cwField('moldTotal','模具费摊销总额','number'),cwField('moldUnit','单台摊销模具费','number'),cwField('agreed','约定摊销台数','integer'),cwField('picked','实际提货台数','integer'),cwField('amortized','实际摊销台数','integer'),cwField('amortizedAmount','实际摊销金额','number')],
 [...cwCommon,cwField('refurbTarget','目标翻新费率','percent'),cwField('estimated','预估单台翻新费','number'),cwField('price','单台出厂价','number'),cwField('confirmed','联检确认单台翻新费','number'),cwField('factoryReturn','工厂退货率','percent'),cwField('allocated','实际单台分摊翻新费','number')],
 [cwField('id','记录编号'),cwField('date','数据日期','date'),cwField('chainName','所属品链'),cwField('owner','采购人员'),cwField('name','物料名称'),cwField('unit','价格单位'),cwField('source','数据来源'),cwField('today','当日价','number'),cwField('lastToday','去年同期当日价','number'),cwField('average','近30天均价','number'),cwField('lastAverage','去年同期30天均价','number')]
];
const cwComputedFields=[[],[['unitSavingRate','单台累计降本率','percent'],['actualProgress','实际完成进度','number'],['expectedProgress','应完成进度','percent']],[['remainingUnits','剩余摊销台数','integer'],['remainingAmount','剩余摊销金额','number']],[['actualRefurbRate','实际翻新费率','percent']],[['change','涨跌金额','signed'],['changeRate','涨跌幅度','signed'],['averageChange','30天均价波动','signed']]];
cwComputedFields.forEach((list,type)=>list.forEach(([key,label,kind])=>cwFields[type].push({...cwField(key,label,kind,false),computed:true})));
const cwSources=['目标成本：产品立项审批的出厂含税目标成本；实际成本及费率：各报价阶段审批。目标费率：采购管理制度中的装配费率、管理费率、利润率、税费率。','实际降本额：降本明细台账；年度目标额：绩效管理系统年度目标。本页通过导入录入。','模具费分摊管理台账。','翻新预估与联检确认记录、出厂价及翻新费分摊台账。','塑料：中塑在线；金属：上海有色网；芯片：嘉立创。价格单位与物料规格必须一致，本页仅接受导入数据。'];
const cwRules=[
 '实际成本＞目标成本，或装配费率、管理费率、利润率、税费率中任一实际费率＞对应目标费率。按各报价阶段分别判定。',
 '年度实际完成进度＝年度累计降本额÷年度降本目标额；应完成进度＝（数据日期－当年1月1日）÷365。实际进度低于时间进度即预警。',
 '实际提货台数≥约定摊销台数即预警。剩余台数与剩余金额最低显示0；已超摊的部分在详情单独提示。',
 '联检确认单台翻新费＞预估单台翻新费，或实际翻新费率＞目标翻新费率，任一命中即预警。实际翻新费率＝实际单台分摊翻新费÷单台出厂价。',
 '当日波动＝（当日价－近30天均价）÷近30天均价；30天均价波动＝（近30天均价－去年同期30天均价）÷去年同期30天均价。任一绝对涨跌幅＞5%即预警。'
];
function cwEvaluate(type,r){const hits=[],pending=[],d={};const ratio=(n,v,label)=>{if(!(v>0)){pending.push(label+'分母须大于0');return null}return n/v*100};
 if(type===0){if(r.actual-r.target>1e-9)hits.push('超目标成本');cwRates.forEach((n,i)=>{if(r['actualRate'+i]-r['targetRate'+i]>1e-9)hits.push(n+'超标准')});d.costDelta=r.actual-r.target;}
 if(type===1){d.unitSavingRate=ratio(r.cut,r.sealed,'单台降本率');d.actualProgress=ratio(r.yearSaving,r.yearTarget,'年度完成进度');d.expectedProgress=Math.min(100,Math.max(0,(Date.parse(r.date+'T00:00:00Z')-Date.parse(r.date.slice(0,4)+'-01-01T00:00:00Z'))/86400000/365*100));if(d.actualProgress!==null&&d.actualProgress+1e-9<d.expectedProgress)hits.push('降本进度滞后');}
 if(type===2){d.remainingUnits=Math.max(0,r.agreed-r.amortized);d.remainingAmount=Math.max(0,r.moldTotal-r.amortizedAmount);d.excess=Math.max(0,r.amortizedAmount-r.moldTotal);if(r.agreed===0)pending.push('约定摊销台数须大于0');else if(r.picked>=r.agreed)hits.push('模具费分摊完毕');}
 if(type===3){d.actualRefurbRate=ratio(r.allocated,r.price,'实际翻新费率');if(r.confirmed-r.estimated>1e-9)hits.push('联检翻新费超预估');if(d.actualRefurbRate!==null&&d.actualRefurbRate>r.refurbTarget+1e-9)hits.push('实际翻新费率超目标');}
 if(type===4){d.change=r.today-r.average;d.changeRate=ratio(d.change,r.average,'当日波动');d.averageChange=ratio(r.average-r.lastAverage,r.lastAverage,'30天均价波动');if(d.changeRate!==null&&Math.abs(d.changeRate)>5+1e-9)hits.push('当日价格波动＞5%');if(d.averageChange!==null&&Math.abs(d.averageChange)>5+1e-9)hits.push('30天均价波动＞5%');}
 const alerts=[],num=n=>fmt(n,1),money=n=>pfMoneyYuan(n),pp=n=>fmt(n,1)+'%';
 const add=(label,value,basis,short,extra='')=>alerts.push({label,value,basis,short,extra});
 if(type===0){if(d.costDelta>1e-9)add('成本超目标',money(d.costDelta),'实际 '+money(r.actual)+' / 目标 '+money(r.target),'成本超'+money(d.costDelta),r.target>0?'较目标高 '+num(d.costDelta/r.target*100)+'%':'');cwRates.forEach((name,i)=>{const gap=r['actualRate'+i]-r['targetRate'+i];if(gap>1e-9)add(name+'超标准',pp(gap),'实际 '+num(r['actualRate'+i])+'% / 目标 '+num(r['targetRate'+i])+'%',name+'超'+pp(gap));});}
 if(type===1&&d.actualProgress!==null&&d.actualProgress+1e-9<d.expectedProgress){const gap=d.expectedProgress-d.actualProgress,amount=Math.max(0,r.yearTarget*d.expectedProgress/100-r.yearSaving);add('降本进度落后',pp(gap),'实际 '+num(d.actualProgress)+'% / 应完成 '+num(d.expectedProgress)+'%','落后'+pp(gap),'按时间进度少完成 '+money(amount));}
 if(type===2&&r.agreed>0&&r.picked>=r.agreed){const gap=r.picked-r.agreed;add(gap?'提货超约定':'提货已达约定',fmt(gap||r.agreed,0)+'台','实际提货 '+fmt(r.picked,0)+'台 / 约定 '+fmt(r.agreed,0)+'台',gap?'提货超'+fmt(gap,0)+'台':'已达约定'+fmt(r.agreed,0)+'台','需停止后续模具费分摊');if(d.excess>1e-9)add('模具费已超摊',money(d.excess),'实际摊销 '+money(r.amortizedAmount)+' / 总额 '+money(r.moldTotal),'超摊'+money(d.excess));}
 if(type===3){if(r.confirmed-r.estimated>1e-9)add('联检翻新费超预估',money(r.confirmed-r.estimated)+'/台','联检确认 '+money(r.confirmed)+' / 预估 '+money(r.estimated),'翻新费超'+money(r.confirmed-r.estimated)+'/台');if(d.actualRefurbRate!==null&&d.actualRefurbRate>r.refurbTarget+1e-9)add('翻新费率超目标',pp(d.actualRefurbRate-r.refurbTarget),'实际 '+num(d.actualRefurbRate)+'% / 目标 '+num(r.refurbTarget)+'%','费率超'+pp(d.actualRefurbRate-r.refurbTarget));}
 if(type===4){const unit=r.unit||'元';if(d.changeRate!==null&&Math.abs(d.changeRate)>5+1e-9)add(d.change>=0?'当日价格上涨':'当日价格下跌',num(Math.abs(d.changeRate))+'%','当日 '+num(r.today)+' / 近30天均价 '+num(r.average)+' '+unit,(d.change>=0?'上涨':'下跌')+num(Math.abs(d.changeRate))+'%',(d.change>=0?'涨':'跌')+num(Math.abs(d.change))+' '+unit+'；超5%预警线 '+pp(Math.abs(d.changeRate)-5));if(d.averageChange!==null&&Math.abs(d.averageChange)>5+1e-9)add(d.averageChange>=0?'30天均价同比上涨':'30天均价同比下跌',num(Math.abs(d.averageChange))+'%','近30天均价 '+num(r.average)+' / 去年同期 '+num(r.lastAverage)+' '+unit,'均价同比'+(d.averageChange>=0?'涨':'跌')+num(Math.abs(d.averageChange))+'%',(d.averageChange>=0?'涨':'跌')+num(Math.abs(r.average-r.lastAverage))+' '+unit+'；超5%预警线 '+pp(Math.abs(d.averageChange)-5));}
 return {hits,pending,d,alerts,status:hits.length?'预警':pending.length?'待补数据':'正常'};
}
function cwIdentity(type,r){return JSON.stringify([type,r.id,type===0?r.stage:'']);}
function cwSnapshots(type,cutoff,period=pbPeriod('risk')){const latest=new Map();cwRecordSource(period).filter(r=>r.type===type&&r.date<=cutoff).forEach(r=>{const key=cwIdentity(type,r),old=latest.get(key);if(!old||r.date>=old.date)latest.set(key,r)});return [...latest.values()];}
function cwRange(period=pbPeriod('risk')){const b=bounds(period),latest=cwRecordSource(period).filter(r=>r.date>=b.start&&r.date<=b.end).reduce((max,r)=>r.date>max?r.date:max,b.cutoff);return {...b,cutoff:latest};}
function cwRows(type,period=pbPeriod('risk')){const b=cwRange(period);return cwSnapshots(type,b.cutoff,period).filter(r=>pbScope(r)&&(type!==1||r.date.slice(0,4)===String(period.year))).map(r=>({...r,result:cwEvaluate(type,r)}));}
function cwRiskRecord(r){return {...r,key:'CW-'+cwIdentity(r.type,r)+'-'+r.date,kind:'imported-cost',costType:r.type,metric:r.result.alerts[0]?.short||'待补数据',issue:r.result.alerts.map(a=>a.label+' '+a.value+(a.extra?'；'+a.extra:'')).join('；'),level:'高危',dimension:cwTypes[r.type],source:r.source||'成本导入台账',due:shiftDate(r.date,7),result:r.result};}
function cwRisks(){return cwTypes.flatMap((_,i)=>cwRows(i).filter(r=>r.result.status==='预警').map(cwRiskRecord));}
function cwSave(next,silent=false){try{localStorage.setItem(CW_KEY,JSON.stringify(next));cwStore=next;return true}catch(_){if(!silent)toast('保存失败，请检查浏览器存储后重试');return false}}
function cwCommit(type,rows,file,silent=false){const records=[...cwStore.records],now=new Date().toISOString();let added=0,updated=0;for(const r of rows){const key=cwIdentity(type,r),index=records.findIndex(old=>old.type===type&&cwIdentity(type,old)===key&&old.date===r.date),entry={...r,type,importedAt:now};if(index<0){records.push(entry);added++}else{records[index]=entry;updated++}}const batch={at:now,type,file,added,updated};if(!cwSave({records,batches:[batch,...cwStore.batches].slice(0,100)},silent))return null;return batch;}
const cwOldRiskLists=pbRiskLists;pbRiskLists=function(includeClosed=false){const lists=cwOldRiskLists(includeClosed);lists[1]=cwRisks().filter(r=>includeClosed||!pbClosed(r));lists[1].forEach(pbRemember);return lists;};