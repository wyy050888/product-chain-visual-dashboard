// 品质榜试版：卡片指标与抽屉字段共用原值、环比及处罚台账。
const rpQualityCardKeys=['gsv','return','received','sanctions','contact'];
const rpQualityListKeys=['gsv','sales','netSales','margin','return','received','violations','fine','frozen','offShelf','drop','contact','bad','season','productType'];
function rpQualityMoney(yuan){return pfMoneyYuan(yuan).replace(/元$/,'')}
// 原因未分类的事件仅进入全部口径，不能默认归为品质原因。
function rpQualitySelectEvents(monthly,qualityOnly=true){
 return (monthly.allEvents||monthly.events||[]).filter(e=>['罚款','资金冻结','下架','掉权'].includes(e.type)&&(!qualityOnly||e.reasonType==='quality'));
}
function rpQualityEvents(record,start,end,qualityOnly=true){
 return rpQualitySelectEvents(qrObservation(upProduct(upIdentity(record)),record.platform,start,end).monthly,qualityOnly);
}
// 颜色只用于品质榜展示；按业务规范所有环比统一涨绿降红。
function rpQualityChangeValue(current,previous){
 if(!Number.isFinite(current)||!Number.isFinite(previous))return null;
 return current===previous?0:previous>0?(current-previous)/previous*100:null;
}
function rpQualityChange(current,previous){return rpComparisonText(rpQualityChangeValue(current,previous))}
function rpComparisonText(raw){
 if(!Number.isFinite(raw))return '环比 --';
 const change=Math.sign(raw)*Math.round(Math.abs(raw)*10)/10;
 if(change===0)return '环比 持平';
 return '环比 '+(change>0?'↑ ':change<0?'↓ ':'')+upPercent(Math.abs(change));
}
// 所有榜单共用环比色：上涨即绿，跌幅≤10%灰，跌幅>10%红，持平/缺失灰。
function rpComparisonTone(change){
 return 'rp-quality-'+(!Number.isFinite(change)||Math.round(Math.abs(change)*10)===0?'gray':change>0?'green':change< -10-1e-10?'red':'gray');
}
function rpQualityChangeTone(current,previous){return rpComparisonTone(rpQualityChangeValue(current,previous))}
function rpQualityReturnRule(actual,target){
 if(!Number.isFinite(actual)||!Number.isFinite(target)||target<0)return {tone:'rp-quality-gray',targetTone:'rp-quality-gray',target:'偏差 —'};
 const gap=actual-target,epsilon=1e-10;
 const color=Math.abs(gap)<=epsilon?'gray':gap<0?'normal':gap+epsilon>=target*0.05?'red':'yellow';
 return {tone:'rp-quality-'+color,targetTone:'rp-quality-'+(gap< -epsilon?'green':color),target:'偏差 '+(gap>epsilon?'+':'')+upPercent(Math.abs(gap)<=epsilon?0:gap)};
}
function rpQualityAmountTone(value){return 'rp-quality-'+(Number.isFinite(value)&&value>0?'red':'gray')}
function rpQualityProductFields(record){
 const identity=pfIdentity(record),tags=[];
 if(identity.isNew===true)tags.push({kind:'new',label:'新品'});
 else if(identity.isNew===false)tags.push({kind:'old',label:'老品'});
 if(identity.clearance===true)tags.push({kind:'clearance',label:'清仓品'});
 return [rpField('season','季品',identity.attribute||'—'),{...rpField('productType','属性',tags.map(t=>t.label).join('、')||'—'),tags}];
}
function rpQualityFields(record,fields,current,previous,qualityOnly=true){
 fields.push(...rpQualityProductFields(record));
 const events=rpQualitySelectEvents(record.monthly,qualityOnly),earlier=rpQualityEvents(record,previous.start,previous.end,qualityOnly);
 const fine=events.filter(e=>e.type==='罚款'),frozen=events.filter(e=>e.type==='资金冻结');
 const fineAmount=fine.reduce((sum,e)=>sum+(Number(e.amount)||0),0),frozenAmount=frozen.reduce((sum,e)=>sum+(Number(e.amount)||0),0),scope=qualityOnly?'品质原因':'全部原因';
 const patch=(key,props)=>{const field=fields.find(f=>f.key===key);if(field)Object.assign(field,props)};
 const compareHint='上期为紧邻的等长区间；环比＝（本期－上期）÷上期，上期缺失或为0且本期非0时显示--；两期相同显示持平；环比上涨绿色，跌幅≤10%灰色，跌幅>10%红色，持平灰色。';
 for(const [key,now,before] of [['sales',current.sales,previous.sales],['gsv',current.gsvCents,previous.gsvCents],['margin',current.profitRate,previous.profitRate],['contact',current.contactRate,previous.contactRate],['bad',current.badRate,previous.badRate]]){
  const old=fields.find(f=>f.key===key);
  patch(key,{tone:Number.isFinite(now)?'':'rp-quality-gray',target:rpQualityChange(now,before),targetTone:rpQualityChangeTone(now,before),hint:(old?.hint||'')+compareHint});
 }
 patch('sales',{value:fmt(current.sales),hint:'所选期间、所选平台的销量，未扣除退货；'+compareHint});
 patch('gsv',{value:rpQualityMoney(current.gsvCents/100)});
 for(const [key,name,actual,targetKey] of [['return','总退',current.returnRate,'returnTarget'],['received','已收退',current.receivedRate,'receivedTarget']]){
  const target=fields.find(f=>f.key===targetKey)?.sortValue;
  const rule=rpQualityReturnRule(actual,target),old=fields.find(f=>f.key===key);
  patch(key,{name,...rule,hint:(old?.hint||'')+'偏差为0灰色；低于目标时主值正常色、负偏差绿色；高于目标但偏差＜对应目标×5%黄色，达到或超过该阈值红色。'});
 }
 patch('fine',{value:rpQualityMoney(fineAmount),sortValue:fineAmount,target:fine.length+'次',tone:rpQualityAmountTone(fineAmount),targetTone:'rp-quality-gray',hint:scope+'的平台罚款金额及次数。'});
 patch('frozen',{value:rpQualityMoney(frozenAmount),sortValue:frozenAmount,target:frozen.length+'次',tone:rpQualityAmountTone(frozenAmount),targetTone:'rp-quality-gray',hint:scope+'的资金冻结事件金额及次数，不作为实时冻结余额。'});
 const net=current.sales-current.returned,oldNet=previous.sales-previous.returned;
 fields.push({...rpField('netSales','去退后销量',fmt(net),'','同期销量－同期总退件数；'+compareHint,rpQualityChange(net,oldNet)),sortValue:net,targetTone:rpQualityChangeTone(net,oldNet)});
 fields.push({...rpField('violations','违规次数',String(events.length),'',scope+'的罚款、资金冻结、下架、掉权事件合计；'+compareHint,rpQualityChange(events.length,earlier.length)),sortValue:events.length,targetTone:rpQualityChangeTone(events.length,earlier.length)});
 // 下架与掉权分别计数，卡片合计；每项环比都使用各自事件基数。
 for(const [key,name,types] of [['down','链接下架/掉权',['下架','掉权']],['offShelf','链接下架',['下架']],['drop','链接掉权',['掉权']]]){
  const count=events.filter(e=>types.includes(e.type)).length,before=earlier.filter(e=>types.includes(e.type)).length;
  const field={...rpField(key,name,count+'次','','所选期间'+scope+types.join('、')+'事件次数；'+compareHint,rpQualityChange(count,before)),sortValue:count,targetTone:rpQualityChangeTone(count,before)};
  if(fields.some(f=>f.key===key))patch(key,field);else fields.push(field);
 }
 const amount=fineAmount+frozenAmount;
 fields.push({...rpField('sanctions','罚款＆冻结',rpQualityMoney(amount),rpQualityAmountTone(amount),'平台罚款金额与期间冻结事件金额相加；第二行依次为罚款次数/冻结次数，不作为实时冻结余额。',fine.length+'次/'+frozen.length+'次'),sortValue:amount,targetTone:'rp-quality-gray'});
 return fields;
}
function rpQualityCardColumns(){
 const names=['GSV','总退','已收退','罚款＆冻结','进线率/差评率'];
 return '<div class="rp-quality-columns" aria-hidden="true">'+names.map(name=>'<span>'+name+'</span>').join('')+'</div>';
}
// 卡片合并一列展示两个独立指标；抽屉继续使用原字段。
function rpQualityRatePair(contact,bad){
 const fields=[contact,bad],name='进线率/差评率';
 const values=fields.map(f=>'<strong class="'+esc(f.tone)+'" data-rp-pair-value="'+f.key+'" title="'+esc(f.name+'：'+f.hint)+'">'+esc(f.value)+'</strong>').join('<span class="rp-pair-divider">/</span>');
 const changes=fields.map(f=>'<em class="'+esc(f.targetTone||'')+'" data-rp-pair-change="'+f.key+'" title="'+esc(f.name+' '+f.target)+'">'+esc(f.target.replace(/^环比\s*/,''))+'</em>').join('<span class="rp-pair-divider">/</span>');
 return '<div class="rp-quality-metric rp-quality-rate-pair" data-rp-field="contact" aria-label="'+name+'"><span class="rp-quality-mobile-label">'+name+'</span><div class="rp-pair-values">'+values+'</div><small><span class="rp-comparison-label">环比</span> '+changes+'</small></div>';
}
function rpQualityCardEntry(record,index){
 const all=rpFields(0,record,[...rpQualityCardKeys,'bad']),bad=all.find(f=>f.key==='bad'),fields=all.filter(f=>f.key!=='bad');
 return '<article class="rp-entry rp-quality-entry" data-rp-kind="0" data-rp-row="0:'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(0,record,false,true)+'</header><div class="rp-quality-values">'+fields.map(f=>f.key==='contact'?rpQualityRatePair(f,bad):'<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(f.name)+'"><span class="rp-quality-mobile-label">'+esc(f.name)+'</span><strong class="'+esc(f.tone)+'" title="'+esc(f.hint)+'">'+esc(f.value)+'</strong><small class="'+esc(f.targetTone||'')+'">'+rpTargetText(f)+'</small></div>').join('')+'</div></div></article>';
}
