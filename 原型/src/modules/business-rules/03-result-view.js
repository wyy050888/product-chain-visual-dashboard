// 多字段合成一个可编辑条件组；复杂旧条件保留括号层级，不偷换且/或优先级。
function brcResultJoin(id,first){
 const group=brcResultGroup(id),op=brcResultOp(id,brcDraftConditions);
 return first?'<span class="brc-condition-when">当</span>':`<select data-brc-result-join="${id}" aria-label="${esc(group.title+' 条件关系')}"><option value="all" ${op==='all'?'selected':''}>且</option><option value="any" ${op==='any'?'selected':''}>或</option></select>`;
}
function brcResultEditor(id,instance='table',options={}){
 const group=brcResultGroup(id),keys=brcResultMembers(id,brcDraftConditions),root=options.root||id,count=brcResultLeafCount(root,brcDraftConditions);
 const parts=(group.parts||keys).filter(part=>brcResultGroup(part)?brcResultMembers(part,brcDraftConditions).length:keys.includes(part));
 const fields=parts.map((key,index)=>{
  if(brcResultGroup(key)){
   // 当A且B或C可按同组连续显示；只有省略括号会改变含义时才保留边界。
   const inner=brcResultOp(key,brcDraftConditions),outer=brcResultOp(id,brcDraftConditions),inline=index===0&&(inner===outer||inner==='all'&&outer==='any');
   return `<div class="${inline?'brc-condition-inline':'brc-condition-nested'}">${index?`<div class="brc-condition-nested-head">${brcResultJoin(id,false)}</div>`:''}${brcResultEditor(key,instance,{noAdd:true,root})}</div>`;
  }
  const item=brcEditorByKey.get(key),fieldOptions={result:id,first:index===0,removable:count>1,canRemoveField:brcResultMembers(root,brcDraftConditions).length>1};
  return `<div class="brc-field brc-condition-row brc-rule-cell" data-brc-row="${key}" data-brc-instance="${instance}"><div class="brc-rule-editor">${brcConditionControls(item,instance,fieldOptions)}</div></div>`;
 }).join('');
 return `<div class="brc-result-editor" data-brc-result-group="${id}" data-brc-instance="${instance}">${fields}${options.noAdd?'':`<button type="button" class="link brc-condition-add" data-brc-add="${group.addKey||group.keys[0]}" data-brc-path="">＋ 添加条件</button>`}</div>`;
}
function brcResultTableGroups(fields){
 const available=new Set(fields.map(item=>item.key)),used=new Set(),groups=[];
 for(const item of fields){
  if(used.has(item.key))continue;
  const result=brcResultGroups.find(group=>!group.parent&&!group.id.startsWith('grade-')&&!group.id.startsWith('success-')&&group.keys.every(key=>available.has(key))&&group.keys.includes(item.key));
  if(result){result.keys.forEach(key=>used.add(key));groups.push({label:esc(result.title),rows:[{key:result.keys[0],resultGroup:result.id}]});}
  else{used.add(item.key);groups.push({label:esc(item.label),rows:[{key:item.key}]});}
 }
 if(groups.length===1)groups[0].label='';
 return groups;
}
function brcChangeResultRelation(id,op){
 if(!['all','any'].includes(op))return;
 const group=brcResultGroup(id),key=brcResultRelationKey(id),previous=brcResultOp(id,brcDraftConditions),changed=[key];
 for(const member of brcResultMembers(id,brcDraftConditions).filter(member=>!group.parts||group.parts.includes(member))){
  const condition=brcCloneCondition(brcDraftConditions[member]);
  if(condition.conditions&&condition.op===previous){condition.op=op;brcDraftConditions[member]=condition;changed.push(member);}
 }
 brcDraftConditions[key]={...brcCloneCondition(brcDraftConditions[key]),groupOp:op};
 brcDraft=brcProjectValues(brcDraft,brcDraftConditions);brcRefreshDraftState();for(const member of new Set(changed))brcRedrawCondition(member,'','[data-brc-result-join]');
}
