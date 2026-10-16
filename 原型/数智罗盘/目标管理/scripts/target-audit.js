// 历史快照与差异计算：不访问 DOM，不修改目标数据。
(() => {
  const app = GoalPrototype;
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const labels = { shopId:'目标店铺', linkId:'核心链接', region:'大区', brand:'品牌', channel:'渠道', strategy:'店长策略', promotion:'店长推广', gsv:'目标GSV', profit:'目标利润率', rank:'排名目标', clickRate:'点击率目标', conversionRate:'转化率目标', feeRate:'费率目标', newTag:'新品/清仓品', sharedStock:'一盘货', selectedProduct:'一类自选品',created:'创建信息',updated:'更新信息' };
  const fields = kind => ['shopId', ...(kind === 'link' ? ['linkId'] : []), 'region','brand','channel','strategy','promotion', ...app.entrySchema.metrics[kind]];
  const groupKey = row => JSON.stringify([row.cid,row.year,row.monthNumber,app.targetGroup.productKey(row)]);
  const detailKey = row => JSON.stringify([row.shopId,row.linkId || '']);
  const value = (row, field) => ['strategy', 'promotion'].includes(field) ? row[`${field}Id`] || app.fixtures.people?.find(person => person.name === row[field])?.id || row[field] || '' : row[field] ?? '';
  const snapshot = row => structuredClone(Object.fromEntries(['cid','year','monthNumber','month','product','productCode','productMatch','shop','shopCode','shopId','linkId','linkName','strategyId','promotionId',...Object.keys(labels)].filter((v,i,a)=>a.indexOf(v)===i).map(field=>[field,row[field] ?? ''])));
  const signature = (kind, rows) => JSON.stringify(rows.map(row=>[detailKey(row), ...fields(kind).map(field=>value(row,field))]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
  function differences(kind, before, after, pairs = []) {
    const remaining = new Map(after.map(row=>[detailKey(row),row])), result=[];
    for (const old of before) {
      const pair = pairs.find(item=>item.before === detailKey(old));
      // 仅手动编辑提供迁移关系；导入严格匹配店铺及链接身份。
      const current = remaining.get(pair?.after || detailKey(old));
      if (!current) { result.push({type:'removed',before:old,after:null,fields:[]}); continue; }
      remaining.delete(detailKey(current));
      const changed=fields(kind).filter(field=>value(old,field) !== value(current,field));
      if(changed.length) result.push({type:'updated',before:old,after:current,fields:changed});
    }
    for(const current of remaining.values()) result.push({type:'added',before:null,after:current,fields:[]});
    return result;
  }
  function compare(kind, before, after, pairs=[]) {
    const groups=new Map();
    for(const [side,rows] of [['before',before],['after',after]]) for(const row of rows) {
      const id=groupKey(row);
      if(!groups.has(id)) groups.set(id,{kind,before:[],after:[]});
      groups.get(id)[side].push(snapshot(row));
    }
    return [...groups.values()].filter(group=>signature(kind,group.before)!==signature(kind,group.after)).map(group=>{
      const row=group.after[0] || group.before[0];
      return {...group,cid:row.cid,year:row.year,monthNumber:row.monthNumber,product:row.product,productCode:row.productCode,productMatch:row.productMatch,brand:row.brand,
        type:!group.before.length?'added':!group.after.length?'removed':'updated',
        details:differences(kind,group.before,group.after,pairs)};
    });
  }
  function summarize(groups, unchanged=0) {
    const summary={added:0,updated:0,removed:0,unchanged};
    groups.forEach(group=>group.details.forEach(detail=>summary[detail.type]++));
    return summary;
  }
  // 导入主明细只包含本次类型和口径，其余变化均为关联同步。
  const inImportScope = (group, operation) => group.kind === operation.kind && group.cid === operation.cid;
  // 旧导入历史按已保存快照重新对比，仅用于展示，不改写历史或目标。
  function normalizeImport(op) {
    if(op.groupSync || op.source!=='import'||!op.groups?.length)return op;
    const groups=op.groups.flatMap(group=>compare(group.kind,group.before || group.details.flatMap(d=>d.before?[d.before]:[]),group.after || group.details.flatMap(d=>d.after?[d.after]:[]))
      .map(item=>({...item,source:group.source})));
    const summary=summarize(groups);
    summary.unchanged=Number.isFinite(op.total)?Math.max(0,op.total-summary.added-summary.updated):(op.summary?.unchanged || 0);
    return {...op,groups,summary};
  }
  function capture(previous,next,read,meta={}) {
    const groups=[];
    for(const kind of ['product','link']) {
      const contexts=new Map();
      for(const id of new Set([...Object.keys(previous[kind]),...Object.keys(next[kind])])) {
        if(JSON.stringify(previous[kind][id])===JSON.stringify(next[kind][id])) continue;
        const [cid,year,monthNumber]=JSON.parse(id);
        contexts.set(JSON.stringify([cid,year,monthNumber]),{cid,year,monthNumber});
      }
      for(const context of contexts.values()) groups.push(...compare(kind,read(kind,context,previous),read(kind,context,next),meta.pairs));
    }
    if(!groups.length && !meta.import) return null;
    const summary=summarize(meta.import ? groups.filter(group => inImportScope(group, meta)) : groups,meta.unchanged || 0);
    summary.synced = meta.import ? groups.filter(group => !inImportScope(group, meta)).reduce((count, group) => count + group.details.length, 0) : 0;
    groups.forEach(group=>{
      group.source=meta.import?'批量导入':'手动操作';
      group.details.forEach(detail => {
        const row = detail.after || detail.before;
        const synced = meta.synced?.includes(`${group.kind}:${app.targetStore.key(row)}`);
        detail.source = synced ? '大区及人员同步' : group.source;
      });
    });
    const timestamp=new Date().toISOString();
    return {id:id(),timestamp,actor:'系统租户管理员',source:meta.import?'import':'manual',status:'success',...meta,groups,summary};
  }
  app.targetAudit={labels,fields,snapshot,compare,summarize,inImportScope,normalizeImport,capture,detailKey,id};
})();
