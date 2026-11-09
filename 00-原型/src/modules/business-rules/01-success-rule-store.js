// 修改单一考核类型的一套方案；失败时不替换内存或已保存条件。
function brcSuccessCheckRevision(revision){
 if(revision!==brcSaved.revision||(brcRead()?.revision||0)!==revision)throw Error('配置已更新，请刷新后重试');
}
function brcSuccessSaveRule(kind,from,source,{originalFrom=null,revision=brcSaved.revision}={}){
 brcSuccessCheckRevision(revision);
 if(!['quarter','year'].includes(kind)||!brcSuccessPeriodValid(kind,from))throw Error('请选择有效的生效期间');
 const timeline=brcSuccessReadTimeline(brcSaved.successTimeline,brcSaved.conditions,brcSaved.values);
 if(originalFrom!==null){
  const original=brcSuccessVisibleRules(kind).find(row=>row.from===originalFrom);
  if(!original)throw Error('方案已更新，请刷新后重试');
  if(original.status!=='pending'&&from!==brcSuccessEffectiveFrom(kind,original))throw Error('已生效规则的生效期间不能修改');
 }
 if(brcSuccessConflict(kind,from,originalFrom))throw Error(brcSuccessDuplicateText(kind,from));
 const conditions=brcSuccessCopy(source),merged={...brcSaved.conditions,...conditions},invalid=brcValidate(brcProjectValues(brcSaved.values,merged),merged);
 if(invalid)throw Object.assign(Error(invalid.message),{field:invalid.key});
 timeline[kind]=timeline[kind].filter(row=>row.from!==from&&row.from!==originalFrom).concat({from,conditions}).sort((a,b)=>a.from.localeCompare(b.from));
 return brcPersistRules({...brcSaved,revision:brcSaved.revision+1,successTimeline:timeline});
}
function brcSuccessDeleteRule(kind,from,revision=brcSaved.revision){
 brcSuccessCheckRevision(revision);
 if(!['quarter','year'].includes(kind)||from<=brcSuccessCurrent()[kind])throw Error('该方案已生效，请刷新后重试');
 const timeline=brcSuccessReadTimeline(brcSaved.successTimeline,brcSaved.conditions,brcSaved.values);
 if(!timeline[kind].some(row=>row.from===from))throw Error('方案已更新，请刷新后重试');
 timeline[kind]=timeline[kind].filter(row=>row.from!==from);
 return brcPersistRules({...brcSaved,revision:brcSaved.revision+1,successTimeline:timeline});
}
function brcSuccessSaveTarget(raw,revision=brcSaved.revision){
 brcSuccessCheckRevision(revision);
 const item=brcEditorByKey.get('new.successRate'),value=String(raw).trim()===''?NaN:Number(raw);
 if(!Number.isFinite(value)||value<item.min||value>item.max)throw Error('请输入0至100的成功率目标');
 return brcPersistRules({...brcSaved,revision:brcSaved.revision+1,values:{...brcSaved.values,'new.successRate':value}});
}
