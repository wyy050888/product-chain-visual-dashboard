// 多选只管理控件与取值；同字段 OR，跨字段仍由业务模型按 AND 组合。
function pfSelected(value){return [...new Set((Array.isArray(value)?value:[value]).filter(v=>v!=null&&!['all','全部',''].includes(String(v))).map(v=>filterCatalog.normalizeChain(v)||String(v)))]}
function pfIncludes(value,actual){const selected=pfSelected(value);return !selected.length||selected.includes(filterCatalog.normalizeChain(actual)||String(actual))}
function pfOptionSelected(value,option){const selected=pfSelected(value);return selected.length?selected.includes(String(option)):['all','全部'].includes(String(option))}
// 普通多选和分组筛选共用切换规则，保留调用方现有单/多选定义。
function pfToggleChoice(value,option,multiple=true){
 if(!multiple)return option;
 const selected=pfSelected(value);return ['all','全部'].includes(option)?'all':selected.includes(option)?selected.filter(v=>v!==option):[...selected,option];
}
function pfControlValue(control){if(!control.multiple)return control.value;const values=[...control.selectedOptions].map(o=>o.value).filter(v=>!['all','全部'].includes(v));return values.length?values:'all'}
function pfControlSet(control,value){
 if(control.multiple)for(const option of control.options)option.selected=pfOptionSelected(value,option.value);else control.value=value;
 pfMultiSync(control);
 control.uiPlatformControl?.sync();
}
function pfMultiSync(select){
 const menu=select.closest('.pf-multi');if(!menu)return;
 const selected=pfSelected(pfControlValue(select)),options=[...select.options],names=options.filter(o=>selected.includes(o.value)).map(o=>o.textContent);
 // 默认值沿用业务选项文案，例如“全部产品”“全部类目”。
 const allLabel=options.find(o=>['all','全部'].includes(o.value))?.textContent||'全部';
 const text=names.join('、')||allLabel,value=menu.querySelector('.pf-multi-value');
 if(value.textContent!==text)value.textContent=text;
 value.title=text;menu.classList.toggle('pf-multi-active',!!selected.length);
 for(const box of menu.querySelectorAll('[data-pf-multi-option]'))box.checked=selected.length?selected.includes(box.value):['all','全部'].includes(box.value);
 if(select.uiPlatformMulti)uiPlatformSyncMulti(select);
}
let pfMultiControlledId=0;
function pfMultiMount(root,{controlled=false}={}){
 for(const select of root.querySelectorAll('.pf-multi select'))pfMultiSync(select);
 for(const select of root.querySelectorAll('select')){
  if(select.closest('.pf-multi,.pf-attribute')||select.disabled)continue;
  const field=select.parentElement,label=field.querySelector(':scope > .unified-field-name')?.textContent||select.getAttribute('aria-label')||[...field.childNodes].filter(n=>n!==select).map(n=>n.textContent).join('').trim();
  if(!select.hasAttribute('data-pf-multiple')&&!['品牌','链群','所属链群','全部新品所属链群','AI链群筛选'].includes(label))continue;
  const selected=[...select.selectedOptions].map(o=>o.value);
  select.multiple=true;select.hidden=true;select.tabIndex=-1;
  const menu=document.createElement(controlled?'div':'details');menu.className='pf-multi';
  const title=select.dataset.pfLabel||(/品牌/.test(label)?'品牌':'链群');menu.dataset.pfMultiLabel=title;
  menu.innerHTML='<summary class="unified-input-group" aria-label="'+esc(title)+'多选"><span class="unified-field-name">'+esc(title)+'</span><span class="pf-multi-value"></span><i class="ui-dropdown-icon" aria-hidden="true"></i></summary><div class="pf-multi-menu" role="group" aria-label="'+esc(title)+'选项">'+[...select.options].map(o=>'<label class="pf-multi-option"><input type="checkbox" data-pf-multi-option value="'+esc(o.value)+'" '+(o.disabled?'disabled':'')+'><span>'+esc(o.textContent)+'</span></label>').join('')+'</div>';
  // 原生模态框中使用普通按钮和受控面板，避免嵌套details的浏览器原生开合/焦点处理。
  if(controlled){
   menu.dataset.pfControlled='';const summary=menu.querySelector('summary'),button=document.createElement('button'),panel=menu.querySelector('.pf-multi-menu');
   button.type='button';button.className=summary.className;button.dataset.pfMultiTrigger='';button.setAttribute('aria-expanded','false');
   panel.id='pf-controlled-'+(++pfMultiControlledId);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-label',title+'多选');
   button.append(...summary.childNodes);summary.replaceWith(button);
   Object.defineProperty(menu,'open',{get(){return this.hasAttribute('open')},set(value){const next=Boolean(value);if(next===this.hasAttribute('open'))return;this.toggleAttribute('open',next);button.setAttribute('aria-expanded',String(next));this.dispatchEvent(new Event('toggle'))}});
  }
  if(field.matches('label')){field.replaceWith(menu);menu.append(select)}else{select.before(menu);menu.append(select)}
  pfControlSet(select,selected);
 }
}
function pfMultiClose(menu,focus=false){menu.open=false;if(focus)menu.querySelector('summary,[data-pf-multi-trigger]').focus({preventScroll:true})}
document.addEventListener('change',e=>{
 const box=e.target.closest('[data-pf-multi-option]');
 if(!box){if(e.target.matches('select'))pfMultiSync(e.target);return}
 e.stopImmediatePropagation();
 const menu=box.closest('.pf-multi'),select=menu.querySelector('select'),selected=pfSelected(pfControlValue(select));
 const values=pfToggleChoice(selected,box.value);
 const parent=menu.closest('#dialogbody')||menu.closest('#department-view')||menu.closest('section.section')||menu.parentElement;
 const identity=select.id?{id:select.id}:Object.fromEntries([...select.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]));
 pfControlSet(select,values);
 select.dispatchEvent(new Event('change',{bubbles:true}));
 // 部分模块整体重绘，恢复菜单及刚勾选项焦点，允许继续多选。
 queueMicrotask(()=>{
  pfMultiMount(parent);
  const next=select.isConnected?select:identity.id?document.getElementById(identity.id):[...parent.querySelectorAll('.pf-multi select')].find(s=>Object.entries(identity).every(([a,v])=>s.getAttribute(a)===v));
  const replacement=next?.closest('.pf-multi');if(!replacement)return;
  replacement.open=true;[...replacement.querySelectorAll('[data-pf-multi-option]')].find(b=>b.value===box.value)?.focus({preventScroll:true});
 });
},true);
document.addEventListener('click',e=>{
 const current=e.target.closest('.pf-multi');
 if(current?.hasAttribute('data-pf-controlled')&&e.target.closest('[data-pf-multi-trigger]'))current.open=!current.open;
 for(const menu of document.querySelectorAll('.pf-multi[open]'))if(menu!==current)pfMultiClose(menu);
});
window.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 const menu=document.querySelector('.pf-multi[open]');if(!menu)return;
 pfMultiClose(menu,true);e.preventDefault();e.stopImmediatePropagation();
},true);
