// 弹窗复用原条件编辑器；关闭时恢复其他配置的未保存草稿。
let brcSuccessDialogState=null;
function brcSuccessConfirm(text,onConfirm,label='确认'){
 const dialog=document.createElement('dialog');dialog.className='cec-dialog brcs-confirm';
 dialog.innerHTML=`<header><h2>请确认</h2></header><div>${esc(text)}</div><p role="alert"></p><footer><button type="button" class="btn" data-brcs-no>取消</button><button type="button" class="btn primary" data-brcs-yes>${label}</button></footer>`;
 brcPage.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('[data-brcs-no]').onclick=()=>dialog.close();
 dialog.querySelector('[data-brcs-yes]').onclick=()=>{try{onConfirm();dialog.close()}catch(error){dialog.querySelector('[role=alert]').textContent=error.message}};
 return dialog;
}
function brcSuccessCloseDialog(){
 const state=brcSuccessDialogState;if(!state)return;
 brcDraft=state.backup.values;brcDraftConditions=state.backup.conditions;brcError=state.backup.error;brcErrorField=state.backup.field;
 brcClearedConditions.clear();for(const [key,value]of state.backup.cleared)brcClearedConditions.set(key,value);
 brcSuccessDialogState=null;state.dialog.close();state.dialog.remove();brcRender();
}
function brcSuccessRequestClose(){
 const state=brcSuccessDialogState;if(!state)return;
 const dirty=state.from!==state.initialFrom||JSON.stringify(brcSuccessCopy(brcDraftConditions))!==state.initialConditions;
 if(dirty)brcSuccessConfirm('修改尚未保存，确认放弃？',brcSuccessCloseDialog,'放弃修改');else brcSuccessCloseDialog();
}
function brcSuccessRefreshDialog(){
 const state=brcSuccessDialogState;if(!state)return;
 const conflict=brcSuccessConflict(state.kind,state.from,state.originalFrom);
 state.dialog.querySelector('[data-brcs-warning]').textContent=conflict?brcSuccessDuplicateText(state.kind,state.from):'';
 state.dialog.querySelector('[data-brcs-save]').disabled=!!conflict;
 const next=brcSuccessVisibleRules(state.kind).filter(row=>row.from!==state.originalFrom&&row.from>state.from).sort((a,b)=>a.from.localeCompare(b.from))[0];
 const range=brcSuccessPeriodValid(state.kind,state.from)?'适用范围：'+brcSuccessPeriodText(state.kind,state.from)+'起，'+(next?'至'+brcSuccessPeriodText(state.kind,next.from)+'生效前。':'持续至后续规则接替。'):'';
 const effect=state.from<brcSuccessCurrent()[state.kind]?'保存后重算适用期间考核；季度规则同时联动首次成功季度、后续滚入及出池，特批记录保留。':state.from===brcSuccessCurrent()[state.kind]?'保存后，整个当前考核期重新判定。':'保存为待生效方案，当前规则继续执行。';
 state.dialog.querySelector('[data-brcs-impact]').textContent=range+effect;
 state.dialog.querySelector('#brcs-error').textContent='';
}
function brcSuccessOpenDialog(edit=false){
 if(brcSuccessDialogState)return;
 const kind=brcSuccessView.kind,row=edit?brcSuccessSelected():brcSuccessRules(kind).find(row=>row.status==='current');
 const from=edit?brcSuccessEffectiveFrom(kind,row):brcSuccessCurrent()[kind],dialog=document.createElement('dialog');dialog.id='brcs-editor';dialog.className='cec-dialog brcs-editor';
 const locked=edit&&row.status!=='pending';
 const state={dialog,kind,from,initialFrom:from,originalFrom:edit?row.from:null,revision:brcSaved.revision,backup:{values:{...brcDraft},conditions:brcCopyConditions(brcDraftConditions),error:brcError,field:brcErrorField,cleared:new Map(brcClearedConditions)}};
 brcDraftConditions={...brcCopyConditions(brcSaved.conditions),...brcSuccessCopy(row.conditions)};brcDraft=brcProjectValues({...brcSaved.values},brcDraftConditions);brcClearedConditions.clear();brcError='';brcErrorField='';
 state.initialConditions=JSON.stringify(brcSuccessCopy(brcDraftConditions));brcSuccessDialogState=state;
 dialog.innerHTML=`<form id="brcs-editor-form" novalidate><header><h2>${edit?'编辑成功规则':'新增成功规则'}</h2><button type="button" class="cec-close" data-brcs-close aria-label="关闭">×</button></header><div class="brcs-editor-body"><div class="brcs-effective"><span>考核类型：${kind==='quarter'?'季度考核':'年度考核'}</span><label>从 <input type="number" min="1000" max="9999" step="1" value="${from.slice(0,4)}" data-brcs-year ${locked?'disabled':''} aria-label="生效年份">年</label>${kind==='quarter'?`<select data-brcs-quarter ${locked?'disabled':''} aria-label="生效季度">${[1,2,3,4].map(q=>`<option value="${q}" ${from.endsWith('Q'+q)?'selected':''}>Q${q}</option>`).join('')}</select>`:''}<span>起生效</span></div><p data-brcs-warning class="brcs-warning"></p><div data-brcs-conditions>${brcNewSuccessTable(kind==='year')}</div><p data-brcs-impact class="brcs-impact"></p><p id="brcs-error" role="alert"></p></div><footer><button type="button" class="link" data-brcs-defaults>恢复默认条件</button><div><button type="button" class="btn" data-brcs-close>取消</button><button type="submit" class="btn primary" data-brcs-save>保存</button></div></footer></form>`;
 brcPage.append(dialog);dialog.showModal();brcSuccessRefreshDialog();
 dialog.addEventListener('cancel',event=>{event.preventDefault();brcSuccessRequestClose()});
 dialog.addEventListener('input',event=>{if(!event.target.matches('[data-brcs-year]'))return;state.from=event.target.value+(kind==='quarter'?'-Q'+dialog.querySelector('[data-brcs-quarter]').value:'');brcSuccessRefreshDialog()});
 dialog.addEventListener('change',event=>{if(event.target.matches('[data-brcs-quarter]')){state.from=dialog.querySelector('[data-brcs-year]').value+'-Q'+event.target.value;brcSuccessRefreshDialog()}});
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-brcs-close]'))brcSuccessRequestClose();
  if(event.target.closest('[data-brcs-defaults]')){Object.assign(brcDraftConditions,brcSuccessCopy(brcDefaultConditions(brcDefaults)));brcDraft=brcProjectValues(brcDraft,brcDraftConditions);dialog.querySelector('[data-brcs-conditions]').innerHTML=brcNewSuccessTable(kind==='year');brcSuccessRefreshDialog()}
 });
 dialog.querySelector('form').onsubmit=event=>{
  event.preventDefault();event.stopPropagation();
  try{brcSuccessSaveRule(kind,state.from,brcDraftConditions,state);brcSuccessView.selected[kind]=state.from;brcSuccessView.error='';brcSuccessCloseDialog();brcApply();toast('规则已保存')}
  catch(error){dialog.querySelector('#brcs-error').textContent=error.message;const input=error.field?dialog.querySelector('[data-brc-field="'+error.field+'"]'):dialog.querySelector('[data-brcs-year]');input?.setAttribute('aria-invalid','true');input?.focus()}
 };
}
