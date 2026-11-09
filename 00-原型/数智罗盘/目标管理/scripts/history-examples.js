// 只读历史样例：独立于目标存储，刷新不重复写入，不改变当前目标。
(() => {
  const app=GoalPrototype;
  let cached;
  function build(cid,scope) {
    const rows=(kind,monthNumber=9)=>app.model.baseRows(kind==='product'?'ep':'el',{year:2026,monthList:[monthNumber],cid})
      .map(row=>({...row,cid,year:2026,monthNumber,month:`2026/${String(monthNumber).padStart(2,'0')}`,
        created:{name:'系统租户管理员',time:'2026/09/10 09:00:00'},updated:{name:'系统租户管理员',time:'2026/09/10 09:00:00'}}));
    const products=rows('product'),links=rows('link'),audit=app.targetAudit,operations=[];
    const compare=(kind,before,after,source)=>audit.compare(kind,before,after).map(group=>({...group,source}));
    const quarter=items=>[7,8,9].flatMap(monthNumber=>items.map(row=>({...row,monthNumber,month:`2026/${String(monthNumber).padStart(2,'0')}`})));
    function add(name,day,kind,source,groups,extra={}) {
      const summary=audit.summarize(groups);
      operations.push({id:`example-${scope}-${name}`,example:true,timestamp:`2026-09-${day}T09:00:00+08:00`,actor:'系统租户管理员',
        kind,cid,source,status:'success',year:2026,months:[7,8,9],file:`第三季度${kind==='product'?'产品':'产品链接'}目标.xlsx`,groups,summary,...extra});
    }
    const p=products[0],p2=products.find(row=>row.productCode!==p.productCode),p3=products.find(row=>row.productCode!==p.productCode&&row.productCode!==p2.productCode);
    // 覆盖全部初始目标，逐月读取真实样例范围，避免为未填报月份补造目标。
    const allMonths=Array.from({length:12},(_,index)=>index+1);
    for(const kind of ['product','link']) {
      const initial=allMonths.flatMap(monthNumber=>rows(kind,monthNumber));
      add(kind==='product'?'initial':'initial-links',10,kind,'import',compare(kind,[],initial,'批量导入'),{
        months:allMonths,total:initial.length,file:`2026年${kind==='product'?'产品':'产品链接'}目标.xlsx`
      });
    }
    const updated={...p,strategy:'陈云飞',promotion:'刘远锴',gsv:p.gsv+20,profit:19.5,updated:{name:'系统租户管理员',time:'2026/09/11 09:00:00'}};
    // 保证人员字段在当前样例主数据已更新时也有可见变化。
    if(updated.strategy===p.strategy)updated.strategy='孙豫帆';
    const children=links.filter(row=>row.productCode===p.productCode&&row.shopId===p.shopId);
    add('edit-sync',11,'product','manual',[
      ...compare('product',[p],[updated],'手动操作'),
      ...compare('link',children,children.map(row=>({...row,strategy:updated.strategy,promotion:updated.promotion})),'产品目标修改同步')
    ]);
    const destination=products.find(row=>row.shopId!==p2.shopId);
    const moved={...p2,shopId:destination.shopId,shopCode:destination.shopCode,shop:destination.shop,channel:destination.channel,gsv:p2.gsv+10};
    const replacement={...p3,productCode:'SPU00099',product:'智能洗地机新品'};
    const oldQuarter=quarter([p,p2,p3]).map(row=>row.monthNumber===9&&row.productCode===p.productCode?updated:row);
    const newQuarter=quarter([p,moved,replacement]).map(row=>row.productCode===p.productCode?{...(row.monthNumber===9?updated:row),gsv:row.gsv+30}:row);
    const replaced=compare('product',oldQuarter,newQuarter,'批量导入');
    add('replace',12,'product','import',replaced,{total:newQuarter.length});
    add('delete',13,'product','manual',compare('product',[replacement],[],'手动操作'));
    const l=links[0],l2=links.find(row=>row.linkId!==l.linkId);
    const changedLink={...l,gsv:l.gsv+8,profit:18.8,rank:5,clickRate:3.2,conversionRate:5.6,feeRate:12};
    const newLink={...l,linkId:'990000009999',linkName:'新品专享链接'};
    const linkBefore=quarter([l,l2]),linkAfter=quarter([changedLink,newLink]);
    add('links',14,'link','import',compare('link',linkBefore,linkAfter,'批量导入'),{total:linkAfter.length});
    add('link-edit',15,'link','manual',compare('link',[changedLink],[{...changedLink,gsv:changedLink.gsv+5,rank:3}],'手动操作'));
    add('unchanged',16,'product','import',[],{total:8,summary:{added:0,updated:0,removed:0,unchanged:8},file:'第三季度产品目标-重复导入.xlsx'});
    for(const kind of ['product','link'])add(`failed-${kind}`,17,kind,'import',[],{status:'failed',
      file:`第三季度${kind==='product'?'产品':'产品链接'}目标-校验失败.xlsx`,
      reason:kind==='product'?'第4行目标GSV须大于0；第7行店长推广无法识别。本次整批未导入，原有目标保持不变。':'第5行核心链接不属于所填店铺；第8行排名须为正整数。本次整批未导入，原有目标保持不变。',downloadable:true});
    return operations;
  }
  // 无法解析文件时，模拟成功使用页面所在自然季度；旧记录使用固定样例周期。
  const period=({year=2026,monthNumber=9}={})=>{
    const start=Math.floor((monthNumber-1)/3)*3+1;
    return {year,months:[start,start+1,start+2]};
  };
  function records() {
    cached ||= ['一类不含 CID','一类含 CID'].flatMap((cid,index)=>build(cid,index));
    return cached;
  }
  // 仅补齐模拟成功批次；真实导入的无变化结果和失败记录保持原样。
  function completeImport(op) {
    if(op.status!=='demo')return op;
    const scope=op.year&&op.months?.length?{year:op.year,months:op.months}:period({year:op.year});
    if(op.groups?.length)return {...op,...scope};
    const template=records().find(item=>item.cid===op.cid&&item.kind===op.kind&&item.summary.updated>0&&item.id.endsWith(op.kind==='link'?'-links':'-replace'));
    if(!template)return {...op,...scope};
    const sample=template.groups.filter(group=>group.monthNumber===9);
    const groups=scope.months.flatMap(monthNumber=>sample.map(group=>{
      const copy=structuredClone(group),context={cid:op.cid,year:scope.year,monthNumber,month:`${scope.year}/${String(monthNumber).padStart(2,'0')}`};
      const update=row=>row?{...row,...context}:null;
      return {...copy,...context,before:copy.before.map(update),after:copy.after.map(update),
        details:copy.details.map(detail=>({...detail,before:update(detail.before),after:update(detail.after)}))};
    }));
    const summary=app.targetAudit.summarize(groups,template.summary.unchanged/template.months.length*scope.months.length);
    const total=summary.added+summary.updated+summary.unchanged;
    return {...op,...scope,groups,summary,total};
  }
  app.historyExamples={period,completeImport,operations:()=>structuredClone(records())};
})();
