// 统一编辑条件组；共享字段的多个单元格只维护一份草稿。
function brcSetConditionTerms(key,terms,relation='all'){brcDraftConditions[key]=terms.length===1?terms[0]:{op:relation,conditions:terms}}
function brcRefreshConditionValues(){
 for(const item of brcEditorItems.filter(i=>i.group===brcActiveGroup&&i.kind==='condition')){
  const condition=brcDraftConditions[item.key];
  for(const row of brcPage.querySelectorAll('[data-brc-row="'+item.key+'"]')){
   row.querySelector('output').textContent=brcPredicateText(item.key,brcDraftConditions[item.key]);
   for(const input of row.querySelectorAll('[data-brc-bound]'))if(input!==document.activeElement)input.value=brcEditorDisplayValue(brcConditionAt(condition,brcConditionPath(input))?.a,input.dataset.brcUnit);
  }
 }
}
function brcRedrawCondition(key,instance,focus){
 const item=brcEditorByKey.get(key);
 for(const editor of [...brcPage.querySelectorAll('[data-brc-result-group]')].filter(node=>!node.parentElement.closest('[data-brc-result-group]')))if(brcResultGroup(editor.dataset.brcResultGroup).keys.includes(key))editor.outerHTML=brcResultEditor(editor.dataset.brcResultGroup,editor.dataset.brcInstance);
 for(const row of brcPage.querySelectorAll('[data-brc-row="'+key+'"]'))if(!row.closest('[data-brc-result-group]'))row.outerHTML=brcField(item,row.dataset.brcInstance||'table');
 const row=[...brcPage.querySelectorAll('[data-brc-row="'+key+'"]')].find(node=>!instance||node.dataset.brcInstance===instance);
 (row?.querySelector(focus)||row?.closest('[data-brc-result-group]')?.querySelector(focus))?.focus({preventScroll:true});
}
function brcFinishConditionEdit(key,before){
 if(before?.groupOp&&!brcDraftConditions[key].groupOp)brcDraftConditions[key].groupOp=before.groupOp;
 brcClearedConditions.delete(key);brcLinkBandBoundary(key,before,brcDraftConditions[key],brcDraftConditions);brcDraft=brcProjectValues(brcDraft,brcDraftConditions);brcRefreshDraftState();
}
function brcReplaceConditionPath(condition,path,next){if(!path.length)return next;brcConditionAt(condition,path.slice(0,-1)).conditions[path.at(-1)]=next;return condition}
function brcBindConditionEditor(page){
 page.addEventListener('input',event=>{
  const input=event.target.closest('[data-brc-bound]');if(!input)return;
  const key=input.dataset.brcField||input.dataset.brcTermField,item=brcEditorByKey.get(key),value=brcEditorSourceValue(input.value,input.dataset.brcUnit);
  if(item.kind==='parameter'){
   const before=brcDraft[key];
   if(value===null&&!brcClearedConditions.has(key))brcClearedConditions.set(key,{a:before});
   if(key==='stock.refurbDays'&&value!==null)brcLinkRefurbStandard(brcClearedConditions.get(key)?.a??before,value,brcDraftConditions);
   if(value!==null)brcClearedConditions.delete(key);
   brcDraft[key]=value;brcRefreshDraftState();return;
  }
  const before=brcCloneCondition(brcDraftConditions[key]),next=brcCloneCondition(before);
  if(value===null&&!brcClearedConditions.has(key))brcClearedConditions.set(key,before);
  brcConditionAt(next,brcConditionPath(input)).a=value;brcDraftConditions[key]=next;
  if(value!==null){brcLinkBandBoundary(key,brcClearedConditions.get(key)||before,next,brcDraftConditions);brcClearedConditions.delete(key)}
  brcDraft=brcProjectValues(brcDraft,brcDraftConditions);brcRefreshDraftState();
 });
 page.addEventListener('change',event=>{
  const relation=event.target.closest('[data-brc-result-join]');if(relation){brcChangeResultRelation(relation.dataset.brcResultJoin,relation.value);return}
  const control=event.target.closest('[data-brc-op],[data-brc-term-op],[data-brc-join],[data-brc-metric]');if(!control)return;
  const key=control.dataset.brcOp||control.dataset.brcTermOp||control.dataset.brcJoin||control.dataset.brcMetric,before=brcCloneCondition(brcDraftConditions[key]),next=brcCloneCondition(before),path=brcConditionPath(control),term=brcConditionAt(next,path),instance=control.closest('[data-brc-row]').dataset.brcInstance;
  if(control.dataset.brcMetric){
   const previous=brcTermMetric(key,term),metric=brcMetricConfig(key).choices.find(item=>item.id===control.value);if(!metric)return;
   if(control.value===brcMetricConfig(key).default)delete term.metric;else term.metric=control.value;
   if(previous?.unit!==metric.unit)term.a=null;
   if(metric.valueType==='boolean')term.op='eq';
  }else if(control.dataset.brcJoin)term.op=control.value;
  else{if(!brcOperators.some(([op])=>op===control.value))return;term.op=control.value}
  brcDraftConditions[key]=next;brcFinishConditionEdit(key,before);
  const attr=control.dataset.brcMetric?'data-brc-metric':control.dataset.brcJoin?'data-brc-join':control.dataset.brcOp?'data-brc-op':'data-brc-term-op';
  brcRedrawCondition(key,instance,'['+attr+'][data-brc-path="'+path.join('.')+'"]');
 });
 page.addEventListener('click',event=>{
  const button=event.target.closest('[data-brc-add],[data-brc-remove]');if(!button)return;
  const key=button.dataset.brcAdd||button.dataset.brcRemove,before=brcCloneCondition(brcDraftConditions[key]),path=brcConditionPath(button),editor=button.closest('[data-brc-result-group]'),instance=(button.closest('[data-brc-row]')||editor).dataset.brcInstance;let next=brcCloneCondition(before),focus='[data-brc-bound]';
  if(button.dataset.brcAdd){
   const node=brcConditionAt(next,path),grouped=['all','any'].includes(node.op),relation=editor?brcResultOp(editor.dataset.brcResultGroup,brcDraftConditions):grouped?node.op:'all';
   const terms=node.groupSkip?[]:grouped&&node.op===relation?node.conditions:[node],last=terms.at(-1);
   terms.push({op:brcTermMetric(key,last)?.valueType==='boolean'?'eq':['lt','lte'].includes(last?.op)?'gt':'lt',a:null,...(last?.metric?{metric:last.metric}:{})});
   next=brcReplaceConditionPath(next,path,{op:relation,conditions:terms});focus='[data-brc-bound][data-brc-path="'+[...path,terms.length-1].join('.')+'"]';
  }else{
   if(!path.length){const root=editor?.parentElement.closest('[data-brc-result-group]')||editor;if(!root||brcResultMembers(root.dataset.brcResultGroup,brcDraftConditions).length<=1)return;next={...before,groupSkip:true};brcDraftConditions[key]=next;brcFinishConditionEdit(key,before);brcRedrawCondition(key,instance,focus);return}
   const parentPath=path.slice(0,-1),parent=brcConditionAt(next,parentPath);if(parent.conditions.length<=1)return;
   parent.conditions.splice(path.at(-1),1);if(parent.conditions.length===1)next=brcReplaceConditionPath(next,parentPath,parent.conditions[0]);
  }
  brcDraftConditions[key]=next;brcFinishConditionEdit(key,before);brcRedrawCondition(key,instance,focus);
 });
}
