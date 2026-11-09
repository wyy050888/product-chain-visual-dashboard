// 店铺详情复用经营和处罚台账；组织区域、岗位与姓名为稳定原型样例。
const sdTabs=[{key:'operating',label:'业绩表现'},{key:'violations',label:'店铺违规'}];
const sdEventNames={fine:'平台罚款',frozen:'资金冻结',offShelf:'链接下架',drop:'链接掉权',limited:'店铺限单'};
function sdRoles(shop){
 const region=['一','二','三'][shop.id%3],names=['刘畅','周铭','林悦','陈嘉'];
 if(shop.channel==='视频号')return [];
 if(['抖音','快手'].includes(shop.channel))return [{role:'负责人',name:names[shop.id%4],department:(shop.channel==='抖音'?'抖音':'剪运')+region+'区'}];
 return [{role:'店铺推广',name:names[shop.id%4],department:'品牌'+region+'区'},{role:'店铺策略',name:names[(shop.id+1)%4],department:'品牌'+region+'区'}];
}
function sdAssignees(shop){
 const roles=sdRoles(shop);
 return roles.length?roles.map(r=>({...r,label:r.department+'-'+r.name+' · '+r.role})):['刘畅','林悦'].map(name=>({name,department:'店铺运营',label:name+' · 店铺运营'}));
}
function sdModel(shop,state){
 shop={...shop,...sbShopScoreAt(shop,state.end)};
 const current=rpShopPeriodFacts(shop,state.start,state.end,false),range=riskRange(state.start,state.end);
 const previous=rpShopPeriodFacts(shop,range.previousStart,range.previousEnd,false);
 const operating=sdOperatingFacts(shop,state.start,state.end),priorProducts=sampleShopSpuSales(shop,range.previousStart,range.previousEnd);
 const priorSales=priorProducts.reduce((n,r)=>n+r.sales,0),priorReturns=priorProducts.reduce((n,r)=>n+r.returned,0);
 const previousReturnRate=priorSales?priorReturns/priorSales*100:null;
 const events=sdEvents(shop,state.start,state.end);
 return {shop,current,previous,...operating,previousReturnRate,events};
}
function sdEvents(shop,start,end){
 return rpShopPeriodEvents(shop,start,end,false).map(e=>{
  const linked=['offShelf','drop'].includes(e.type),pool=sampleShopProducts(shop),productIndex=(Number(e.date.slice(8))+Object.keys(sdEventNames).indexOf(e.type))%Math.max(1,pool.length),product=pool[productIndex];
  return {...e,id:'WG-'+shop.shopId+'-'+e.date.replaceAll('-','')+'-'+e.type+'-'+e.reasonType,status:'已处罚',
   object:linked&&product?product.name+' 家用款 官方正品':shop.name,
   objectId:linked?'链接id：'+String(730000000000+shop.id*1000+productIndex):'店铺id：'+shop.shopId,
   reason:e.reason||({fine:'商品宣传与实际交付不符',frozen:'售后争议待核对',offShelf:'商品信息不规范',drop:'品质体验未达标',limited:'履约异常'}[e.type]),
   result:['fine','frozen'].includes(e.type)?sdEventNames[e.type]+' '+pfMoneyYuan(e.amount):sdEventNames[e.type]
  };
 }).sort((a,b)=>b.date.localeCompare(a.date));
}
function sdTaskBase(shop,state){return {id:'new|shop:'+shop.shopId,spuId:'shop:'+shop.shopId,scope:'shop',shopId:shop.shopId,objectName:shop.name,platform:shop.channel,start:state.start,end:state.end,title:'',description:'',plan:'',assignee:'',department:'',due:'',priority:'P2',status:'pending',assignedBy:'',assignedAt:'',completedAt:'',evidence:'',basis:[],logs:[],source:'manual',assignees:sdAssignees(shop)}}
function sdSuggestions(m,state){
 const full=sdAiFullContext(m.shop);m=full.model;state=full.state;
 const base=sdTaskBase(m.shop,state),items=[],c=m.current,book=sdPlatformPlaybooks[m.shop.channel];
 const reasons={freeze:'冻结事件可能影响资金周转，须按记录确认当前处置状态。事件金额不等于当前冻结余额，不能按汇总金额认定仍被冻结。',penalty:'罚款增加成本，下架、掉权与限单可能影响经营。应按已记录原因、对象和状态安排整改，不能把所有处罚归为品质问题。',score:'店铺分未达到本平台配置的绿色区间，分项评分用于确定排查方向；不能直接认定具体岗位失责，也不能从单次快照推断评分持续下降。',returns:'总退较上期上升，应结合店内SPU及去退后销量判断影响；没有目标和原因明细时，不直接认定退货超标或商品质量异常。'};
 const add=(key,title,description,plan,priority)=>items.push({...base,id:[base.spuId,state.start,state.end,key].join('|'),source:'ai',status:'suggested',suggestionKey:key,department:base.assignees[0].department,title,description:upTodoProblem(state,[description],reasons[key]+(['freeze','penalty'].includes(key)?' 平台核查重点：'+book.focus:'')),descriptionVersion:3,plan:plan+(['freeze','penalty'].includes(key)?' '+book.deliverable:''),priority,basis:[state.start+' — '+state.end,description]});
 if(c.frozen)add('freeze','核对冻结事件并补齐解冻材料',`历史累计冻结${c.frozenCount}次，事件金额${pfMoneyYuan(c.frozen)}，不代表当前冻结余额。`,'逐条核对冻结通知、关联订单和解冻条件，提交材料并记录平台回执；核对余额确认是否已解冻。','red');
 if(c.fine||c.offShelf||c.drop||c.limited)add('penalty','完成处罚条目整改与申诉核对',`罚款${pfMoneyYuan(c.fine)}，下架${c.offShelf}次，掉权${c.drop}次，限单${c.limited}次。`,'按违规编号确认对象、申诉截止时间与整改要求，修正对应内容或履约环节，逐项回填结果。','red');
 if(sdScoreFacts(m.shop).low)add('score','复核评分短板并明确整改责任',sdScoreFacts(m.shop).text,'复核店铺总分及商品、物流、服务分的评分口径，标记需关注分项；与已有违规原因交叉核对，原因明确后再协同对应部门，提交整改项和评分复查结果。','yellow');
 const recent=m.recent,priorRate=m.previousReturnRate;
 if(recent.returned&&priorRate!==null&&recent.returnRate>priorRate+1e-10)add('returns','复核退货变化及重点关注商品',`近30日（${recent.start} — ${recent.end}）销量${fmt(recent.sales)}，总退${upPercent(recent.returnRate)}，紧邻上期${upPercent(priorRate)}，上升${fmt(recent.returnRate-priorRate,1)}%；退货数量${fmt(recent.returned)}。`,'按店内SPU业绩复核退货数量、总退及去退后销量，列出重点关注商品；仅对已有违规对象可关联的事项标记共同风险，回填后续同口径业绩变化，不直接认定退货根因。','yellow');
 return items;
}
function sdTodoList(m,state){
 const proposals=sdSuggestions(m,state),base=sdTaskBase(m.shop,state),existing=Object.values(upTodos).filter(t=>t.spuId===base.spuId);
 if(!existing.length){
  const first=proposals[0]||{...base,title:m.shop.channel==='视频号'?'复核店铺经营表现':m.shop.channel==='拼多多'?'复核核心链接与经营表现':'复核店铺评分与经营表现',description:m.shop.channel==='视频号'?'复核去退后销量及违规变化。':m.shop.channel==='拼多多'?'复核核心链接考核、去退后销量及违规变化。':'复核店铺评分、去退后销量及违规变化。',plan:m.shop.channel==='视频号'?'按相同口径记录业绩与违规复查结果。':m.shop.channel==='拼多多'?'按相同口径记录链接考核、业绩与违规复查结果。':'按相同口径记录评分、业绩与违规复查结果。'},now=aiToday();
  const sample={...first,id:'history|'+base.spuId,source:'sample',status:'working',assignee:base.assignees[0].name,department:base.assignees[0].department,assignedBy:upTodoCurrentUser,assignedAt:shiftDate(now,-2)+'T09:00:00+08:00',due:shiftDate(now,2),basis:first.basis?.length?first.basis:['店铺全量经营记录复核'],suggestionKey:undefined};
  upPersistTodos({...upTodos,[sample.id]:sample});existing.push(sample);
 }
 for(let i=0;i<existing.length;i++){const t=existing[i];if(!upTodoCanUpgrade(t))continue;const s={...state,start:t.start,end:t.end},updated=sdSuggestions(sdModel(m.shop,s),s).find(p=>p.suggestionKey===t.suggestionKey||p.title===t.title);if(updated){existing[i]={...t,description:updated.description,descriptionVersion:2};upPersistTodos({...upTodos,[t.id]:existing[i]})}}
 const range=sdAiFullContext(m.shop).state;
 const issued=new Set(existing.filter(t=>t.start===range.start&&t.end===range.end).map(t=>t.suggestionKey));
 return [...proposals.filter(t=>!issued.has(t.suggestionKey)),...existing.filter(t=>!t.deletedAt)];
}
