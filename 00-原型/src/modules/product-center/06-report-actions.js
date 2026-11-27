let pcWeeklyOpenMenu=null;

function pcWeeklyActionCell({monday,label,reports},scope,department){
 const available=Boolean(reports[scope]),menuId=pcWeeklyMenuId(monday,scope);
 return `<button type="button" class="link ui-icon-label" data-pc-weekly-trigger="${monday}" popovertarget="${menuId}" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" aria-label="周报操作 · ${esc(label)} · ${esc(department)}">
   <span>周报操作</span><i class="ui-dropdown-icon" aria-hidden="true"></i>
  </button>
  <div id="${menuId}" class="pc-weekly-menu" data-pc-weekly-panel="${monday}" data-pc-weekly-scope="${scope}" popover="auto" role="menu" aria-label="周报操作">
   <button type="button" role="menuitem" data-pc-weekly-action="download" ${available?'':'disabled'}>下载周报</button>
   <button type="button" role="menuitem" data-pc-weekly-action="upload">上传周报</button>
   <button type="button" role="menuitem" data-pc-weekly-action="history">变更记录</button>
  </div>`;
}

function pcWeeklyMenuId(monday,scope){return `pc-weekly-menu-${scope}-${monday}`}
function pcWeeklyTrigger(menuId){return document.querySelector(`[popovertarget="${menuId}"]`)}

function pcWeeklyPlaceMenu(menu,trigger,align='end'){
 const anchor=trigger.getBoundingClientRect(),width=document.documentElement.clientWidth;
 const {width:menuWidth,height:menuHeight}=menu.getBoundingClientRect();
 const anchorLeft=align==='start'?anchor.left:anchor.right-menuWidth;
 const left=Math.max(8,Math.min(anchorLeft,width-menuWidth-8));
 const top=anchor.bottom+menuHeight+4<=innerHeight-8?anchor.bottom+4:Math.max(8,anchor.top-menuHeight-4);
 Object.assign(menu.style,{left:left+'px',top:top+'px'});
}

document.addEventListener('toggle',event=>{
 const menu=event.target,week=menu.dataset?.pcWeeklyPanel;
 if(!week)return;
 const trigger=pcWeeklyTrigger(menu.id),open=menu.matches(':popover-open');
 trigger?.setAttribute('aria-expanded',String(open));
 if(open&&trigger){
  pcWeeklyOpenMenu=menu;
  pcWeeklyPlaceMenu(menu,trigger);
  menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 }else if(pcWeeklyOpenMenu===menu)pcWeeklyOpenMenu=null;
},true);

function pcWeeklyRepositionMenu(){
 if(!pcWeeklyOpenMenu?.matches(':popover-open')){pcWeeklyOpenMenu=null;return}
 const trigger=pcWeeklyTrigger(pcWeeklyOpenMenu.id);
 if(trigger?.checkVisibility())pcWeeklyPlaceMenu(pcWeeklyOpenMenu,trigger);
 else pcWeeklyOpenMenu.hidePopover();
}
document.addEventListener('scroll',pcWeeklyRepositionMenu,true);
window.addEventListener('resize',pcWeeklyRepositionMenu);

document.addEventListener('keydown',event=>{
 const menu=event.target.closest('[data-pc-weekly-panel]');
 if(!menu?.matches(':popover-open'))return;
 const trigger=pcWeeklyTrigger(menu.id);
 if(event.key==='Escape'||event.key==='Tab'){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation()}
  menu.hidePopover();
  trigger?.focus({preventScroll:true});
  return;
 }
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();
 const items=[...menu.querySelectorAll('button:not(:disabled)')],at=items.indexOf(document.activeElement);
 const index=event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
 items[index]?.focus({preventScroll:true});
});

function pcWeeklyDialog(week,title,body,footer){
 const dialog=document.createElement('dialog');
 dialog.className='gd-task-entry-dialog pc-weekly-dialog';
 dialog.setAttribute('aria-labelledby','pc-weekly-dialog-title');
 const department=gdWeeklyReportScopes.find(([key])=>key===week.reportScope)?.[1];
 dialog.innerHTML=`<form><header><h3 id="pc-weekly-dialog-title">${title}</h3><button type="button" class="gd-task-entry-close" data-pc-weekly-close aria-label="关闭${title}">×</button></header><div class="gd-task-entry-body"><p class="pc-weekly-dialog-period">${esc(week.label)} · ${esc(department)}</p>${body}</div><footer>${footer}</footer></form>`;
 dialog.querySelectorAll('[data-pc-weekly-close]').forEach(button=>button.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.remove();pcWeeklyTrigger(pcWeeklyMenuId(week.monday,week.reportScope))?.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);
 dialog.showModal();
 return dialog;
}

function pcWeeklyOpenUpload(week){
 const body='<p>上传 PDF 后将作为本周的当前周报，已有版本可在变更记录中下载。</p><label class="pc-weekly-file">选择周报 PDF <input type="file" accept=".pdf,application/pdf" required autofocus></label><p class="gd-task-entry-error" role="alert" data-pc-weekly-error hidden></p>';
 const footer='<button type="button" class="btn" data-pc-weekly-close>取消</button><button type="submit" class="btn primary">上传</button>';
 const dialog=pcWeeklyDialog(week,'上传周报',body,footer);
 const form=dialog.querySelector('form'),input=form.querySelector('input'),submit=form.querySelector('[type="submit"]');
 const error=form.querySelector('[data-pc-weekly-error]');
 dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault()});
 input.addEventListener('change',()=>{error.hidden=true});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const file=input.files[0];
  if(submit.disabled||!file)return;
  const buttons=[...form.querySelectorAll('button')];
  buttons.forEach(button=>button.disabled=true);
  input.disabled=true;
  submit.textContent='上传中…';
  error.hidden=true;
  try{
   if(!pcCanAccessWeeklyScope(week.reportScope)){dialog.close();return}
   if(!/\.pdf$/i.test(file.name)||await file.slice(0,5).text()!=='%PDF-'){
    error.textContent='请选择有效的 PDF 周报';
    error.hidden=false;
    return;
   }
   await pcWeeklyAddVersion(week.reportScope,week.monday,file);
   if(pcCanAccessWeeklyScope(week.reportScope))gdRender({reuseData:true});
   dialog.close();
   toast('周报上传成功');
  }catch{
   error.textContent='周报保存失败，请重试';
   error.hidden=false;
  }finally{
   input.disabled=false;
   buttons.forEach(button=>button.disabled=false);
   submit.textContent='上传';
  }
 });
}

const pcWeeklyChangeTime=new Intl.DateTimeFormat('sv-SE',{
 timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
function pcWeeklyOpenHistory(week){
 const versions=[...(pcWeeklyStore(week.reportScope).versions.get(week.monday)||[])];
 if(week.aiReport)versions.push({id:'ai',actor:'AI生成',at:week.aiReportAt});
 const rows=versions.map(({id,actor,at})=>{
  const time=at?`<time datetime="${esc(at)}">${presentationDateText(pcWeeklyChangeTime.format(new Date(at)))}</time>`:'—';
  return `<tr><td>${esc(actor)}</td><td>${time}</td><td><button type="button" class="link" data-pc-weekly-version="${id}">下载周报</button></td></tr>`;
 }).join('');
 const body=`<table class="pc-weekly-history" aria-label="周报变更记录"><thead><tr><th scope="col">变更人</th><th scope="col">变更日期</th><th scope="col">下载周报</th></tr></thead><tbody>${rows||'<tr><td colspan="3">暂无变更记录</td></tr>'}</tbody></table>`;
 const dialog=pcWeeklyDialog(week,'变更记录',body,'<button type="button" class="btn" data-pc-weekly-close>关闭</button>');
 dialog.addEventListener('click',event=>{
  const version=event.target.closest('[data-pc-weekly-version]')?.dataset.pcWeeklyVersion;
  if(version==='ai')gdDownloadWeeklyReportFile(week.monday,week.aiReport);
  else if(version)pcWeeklyDownloadVersion(week.reportScope,Number(version));
 });
}

document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-pc-weekly-action]');
 if(!action||action.disabled)return;
 const menu=action.closest('[data-pc-weekly-panel]'),{pcWeeklyPanel:monday,pcWeeklyScope:scope}=menu.dataset;
 menu.hidePopover();
 pcWeeklyTrigger(menu.id)?.focus({preventScroll:true});
 if(!pcCanAccessWeeklyScope(scope))return;
 await pcWeeklyInitVersions(scope);
 if(!pcCanAccessWeeklyScope(scope)||gdState.part!=='execution')return;
 const row=gdWeeklyReportRows().find(row=>row.monday===monday),week=row?.departmentReports?.[scope]||(row?.reportScope===scope?row:null);
 if(!week)return;
 if(action.dataset.pcWeeklyAction==='upload')pcWeeklyOpenUpload(week);
 else if(action.dataset.pcWeeklyAction==='history')pcWeeklyOpenHistory(week);
 else if(week.uploadedVersion)pcWeeklyDownloadVersion(scope,week.uploadedVersion.id);
 else if(week.aiReport)gdDownloadWeeklyReportFile(week.monday,week.aiReport);
});
