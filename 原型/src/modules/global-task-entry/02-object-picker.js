// 业务对象单选：按类型检索主数据，提交稳定ID，展示名称；下拉不改变任务模型。
function gdTaskObjectPickerMarkup(){
 return '<div class="gd-task-object-picker" data-gd-object-picker><input name="objectReference" role="combobox" aria-label="业务对象" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="gd-task-object-options" aria-expanded="false" placeholder="先选择业务对象类型" autocomplete="off" disabled maxlength="200"><div id="gd-task-object-options" class="gd-task-object-options" role="listbox" aria-label="业务对象选项" popover="manual" hidden></div></div>';
}
function gdBindTaskObjectPicker(form,catalog,initial=null){
 const dialog=form.closest('dialog'),picker=form.querySelector('[data-gd-object-picker]'),input=form.querySelector('[name=objectReference]'),typeControl=form.querySelector('[name=objectType]'),menu=picker.querySelector('[role=listbox]'),category=form.querySelector('[name=category]'),chain=form.querySelector('[data-gd-task-chain]'),controller=new AbortController();
 let matches=[],index=-1,selected=null;
 const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1};
 // 已关联对象的链群由主数据决定；未关联任务仍可自行指定，店铺无链群。
 const syncCategory=()=>{const type=typeControl.value;category.disabled=!!type;category.value=selected?.category||'';category.options[0].textContent=!type?'未指定':selected?'未维护链群':'选择业务对象后自动带出'};
 const reset=()=>{selected=null;delete input.dataset.objectId;syncCategory();input.setCustomValidity(input.required?'请从下拉选项选择业务对象':'')};
 const choose=(object,focus=true)=>{selected=object;input.dataset.objectId=object.id;input.value=object.name;input.setCustomValidity('');syncCategory();close();if(focus)input.focus()};
 const show=()=>{
  if(input.disabled)return;
  const query=selected?'':gdTaskObjectKey(input.value),type=typeControl.value;
  matches=catalog.filter(object=>object.type===type&&(!query||object.aliases.some(alias=>gdTaskObjectKey(alias).includes(query))));index=-1;
  menu.innerHTML=matches.length?matches.map((object,i)=>`<button type="button" role="option" tabindex="-1" aria-selected="${selected?.id===object.id}" id="${menu.id}-${i}" data-gd-object-type="${object.type}" data-gd-object-index="${i}" data-gd-object-id="${esc(object.id)}" data-gd-object-code="${esc(object.code)}" data-gd-object-model="${esc(object.model||'')}"><b>${object.type==='shop'?`<span>${esc(object.name)}</span>${object.platform?rpPlatformMark(object.platform):''}`:esc(object.name)}</b><small>${esc(object.type==='project'?object.projectType||'—':[object.code,object.model].filter(Boolean).join(' · '))}</small></button>`).join(''):'<div class="gd-task-object-empty">没有匹配的业务对象</div>';
  menu.hidden=false;const rect=input.getBoundingClientRect(),width=Math.min(rect.width,innerWidth-24);
  Object.assign(menu.style,{width:width+'px',left:Math.max(8,Math.min(rect.left,innerWidth-width-12))+'px',maxHeight:'240px'});menu.showPopover();
  const below=Math.max(0,innerHeight-rect.bottom-12),above=Math.max(0,rect.top-12),needed=Math.min(240,menu.scrollHeight+2),down=below>=needed||below>=above,height=Math.max(32,Math.min(needed,down?below:above));
  menu.style.maxHeight=height+'px';menu.style.top=(down?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';input.setAttribute('aria-expanded','true');
 };
 const changeType=()=>{
  close();const type=typeControl.value;input.value='';input.disabled=!type;input.required=!!type;
  input.placeholder=({product:'请输入产品名称/SPU码/型号',shop:'请输入店铺名称/店铺ID',project:'请输入项目名称'})[type]||'先选择业务对象类型';
  chain.hidden=type==='shop';reset();
 };
 typeControl.addEventListener('change',changeType);if(initial)typeControl.value=initial.type;changeType();if(initial)choose(initial,false);
 // 点击切换开合；聚焦不自动展开，避免首次点击的focus/click先开后关。
 input.addEventListener('click',()=>{if(menu.hidden)show();else close()});input.addEventListener('input',()=>{reset();show()});
 input.addEventListener('change',()=>{if(selected)return;try{const object=gdTaskResolveObject(typeControl.value,input.value.trim(),catalog);if(object)choose(object,false)}catch(_){}});
 menu.onpointerdown=event=>event.preventDefault();menu.onclick=event=>{const option=event.target.closest('[data-gd-object-index]');if(option)choose(matches[Number(option.dataset.gdObjectIndex)])};
 input.onkeydown=event=>{
  if(event.isComposing)return;
  if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close();return}
  if(['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();if(menu.hidden)show();if(!matches.length)return;
   index=index<0?(event.key==='ArrowDown'?0:matches.length-1):(index+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
   for(const [i,option]of [...menu.querySelectorAll('[role=option]')].entries())option.setAttribute('aria-selected',String(i===index));
   input.setAttribute('aria-activedescendant',menu.id+'-'+index);menu.children[index].scrollIntoView({block:'nearest'});
  }else if(event.key==='Enter'&&!menu.hidden){event.preventDefault();event.stopPropagation();if(index>=0)choose(matches[index]);else if(matches.length===1)choose(matches[0])}
 };
 picker.onfocusout=()=>queueMicrotask(()=>{if(!picker.contains(document.activeElement))close()});
 dialog.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},{capture:true,signal:controller.signal});
 window.addEventListener('resize',close,{signal:controller.signal});dialog.addEventListener('close',()=>{close();controller.abort()},{once:true,signal:controller.signal});
 return {close,destroy:()=>{close();controller.abort()},reference:()=>{if(input.disabled)return '';if(!selected)throw Error('请从下拉选项选择业务对象');return selected.id}};
}
