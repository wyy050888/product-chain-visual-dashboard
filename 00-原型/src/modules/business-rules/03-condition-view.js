// 所有可判定项复用同一组操作器、区间和边界控件。
function brcNumericInput(item,value,bound='a',instance='',term=0,path=[]){
 const key=item.key,invalid=brcErrorField===key?'aria-invalid="true" aria-describedby="brc-error"':'';
 const suffix=(instance?'-'+instance:'')+(term?'-condition-'+(term+1):'');
 const field=term===0?`data-brc-field="${key}"`:`data-brc-term-field="${key}"${term===1?` data-brc-upper="${key}"`:''}`;
 if(item.valueType==='boolean')return `<select id="brc-${key}${suffix}" ${field} data-brc-unit="" data-brc-path="${path.join('.')}" data-brc-term-index="${term}" data-brc-bound="a" aria-label="${esc(item.section+' '+item.label)}" required ${invalid}><option value="" ${value===null?'selected':''}>请选择</option><option value="0" ${value===0?'selected':''}>否</option><option value="1" ${value===1?'selected':''}>是</option></select>`;
 return `<input id="brc-${key}${suffix}" ${field} data-brc-unit="${esc(item.unit)}" data-brc-path="${path.join('.')}" data-brc-term-index="${term}" data-brc-bound="a" type="number" inputmode="decimal" min="${brcEditorDisplayValue(item.min,item.unit)}" max="${brcEditorDisplayValue(item.max,item.unit)}" step="${brcEditorDisplayValue(item.integer?1:.01,item.unit)}" value="${brcEditorDisplayValue(value,item.unit)}" aria-label="${esc(item.section+' '+item.label+(term?' 条件'+(term+1):''))}" required ${invalid}>`;
}
function brcConditionControls(item,instance='',options={}){
 const c=brcNormalizeCondition(brcDraftConditions[item.key]),config=brcMetricConfig(item.key);let leafIndex=0;
 const relation=(node,path,index)=>options.result&&!path.length?brcResultJoin(options.result,options.first&&index===0):index===0?'<span class="brc-condition-when">当</span>':`<select data-brc-join="${item.key}" data-brc-path="${path.join('.')}" aria-label="${esc(item.label+' 条件关系')}"><option value="all" ${node.op==='all'?'selected':''}>且</option><option value="any" ${node.op==='any'?'selected':''}>或</option></select>`;
 const remove=(path,index,group=false)=>`<button type="button" class="link brc-condition-remove" data-brc-remove="${item.key}" data-brc-path="${path.join('.')}" data-brc-term-index="${index}" aria-label="${esc('移除'+item.label+(group?'条件组':'条件'+(index+1)))}">移除${group?'条件组':''}</button>`;
 const render=(node,path=[])=>{
  const grouped=['all','any'].includes(node.op);
  if(options.result&&!path.length&&grouped&&node.op!==brcResultOp(options.result,brcDraftConditions)){
   const inner=brcConditionControls(item,instance,{noAdd:true});
   return `<div class="brc-condition-nested"><div class="brc-condition-nested-head">${brcResultJoin(options.result,options.first)}${options.canRemoveField?remove([],0,true):''}</div>${inner}</div>`;
  }
  const terms=grouped?node.conditions:[node];
  const rows=terms.map((term,child)=>{
   const termPath=grouped?[...path,child]:path,join=relation(node,path,child);
   if(['all','any'].includes(term.op))return `<div class="brc-condition-nested"><div class="brc-condition-nested-head">${join}${terms.length>1?remove(termPath,leafIndex,true):''}</div>${render(term,termPath)}</div>`;
   const index=leafIndex++,metric=brcTermItem(item,term),attrs=`data-brc-path="${termPath.join('.')}" data-brc-term-index="${index}"`;
   const metricSelect=`<select data-brc-metric="${item.key}" ${attrs} aria-label="${esc(item.section+' '+item.label+' 条件'+(index+1)+' 指标')}">${config.choices.map(choice=>`<option value="${choice.id}" ${choice.id===(term.metric||config.default)?'selected':''}>${esc(choice.label)}</option>`).join('')}</select>`;
   const opAttr=index===0?'data-brc-op':'data-brc-term-op',id='brc-op-'+item.key+(instance?'-'+instance:'')+(index?'-condition-'+(index+1):'');
   const opOptions=brcOperators.filter(([op])=>metric.valueType!=='boolean'||op==='eq').map(([op,label])=>`<option value="${op}" ${op===term.op?'selected':''}>${esc(label)}</option>`).join('');
   return `<div class="brc-condition-clause" data-brc-term-row="${index}">${join}${metricSelect}<select id="${id}" ${opAttr}="${item.key}" ${attrs} aria-label="${esc(item.section+' '+item.label+' 条件'+(index+1)+' 比较方式')}">${opOptions}</select><div class="brc-condition-value">${brcNumericInput(metric,term.a,'a',instance,index,termPath)}<span class="brc-unit">${esc(brcEditorUnit(metric.unit).label)}</span></div>${terms.length>1||options.removable?remove(termPath,index):''}</div>`;
  }).join('');
  return `<div class="brc-condition-controls">${rows}${options.result||options.noAdd?'':`<button type="button" class="link brc-condition-add" data-brc-add="${item.key}" data-brc-path="${path.join('.')}">＋ 添加条件</button>`}</div>`;
 };
 return render(c)+`<output class="brc-rule-summary" data-brc-summary="${item.key}">${esc(brcPredicateText(item.key,c))}</output>`;
}
