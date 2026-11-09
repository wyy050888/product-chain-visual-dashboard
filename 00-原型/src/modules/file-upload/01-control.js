// 只统一文件选择与拖放；读取、校验和提交仍由各业务负责。
const uiUploadControls=new WeakMap();
const uiUploadModules={
 'lt-import-file':'生命周期目标','cec-file':'降本目标与实际','klc-file':'核心链接',
 'ssi-file':'供应商名单','cw-file':'成本预警','gd-task-file':'任务'
};
const uiUploadIcon='<svg viewBox="0 0 36 40" aria-hidden="true"><path d="M6 2h17l8 8v27H6Z" fill="#dceeff"/><path d="M23 2v9h8" fill="#8bc6ff"/><path d="M11 16h15M11 21h15M11 26h8" stroke="#fff" stroke-width="3"/><path d="M23 39h9a5 5 0 0 0 0-10 7 7 0 0 0-13 1 4 4 0 0 0 4 9" fill="#1677ff"/><path d="M27 36v-6m-2 2 2-2 2 2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function uiUploadBytes(bytes){return bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+'KB':(bytes/1024/1024).toFixed(1).replace(/\.0$/,'')+'MB'}
function uiUploadOptions(input){
 const images=input.id==='cw-images',attachment=input.name==='attachment';
 return {limit:images?200*1024:attachment?600*1024:5*1024*1024,total:images?1024*1024:Infinity,
  hint:input.dataset.uploadHint|| (images?'支持 PNG、JPG、WebP，单张200KB，合计1MB':attachment?'支持图片、PDF，单份600KB':'支持 .xlsx、.csv，最大5MB'),
  caption:images?'产品图片（可选）':attachment?'附件':''};
}
function uiUploadMount(input){
 if(uiUploadControls.has(input))return;
 let zone=input.closest('label');
 if(!zone){zone=document.createElement('label');input.before(zone);zone.append(input)}
 const config=uiUploadOptions(input),filename=zone.querySelector('[id$="filename"]');
 const field=document.createElement('div');field.className='ui-upload-field'+(zone.classList.contains('full')?' full':'');
 zone.before(field);field.append(zone);zone.className='ui-upload-zone';zone.tabIndex=0;zone.setAttribute('role','button');
 zone.setAttribute('aria-label',config.caption||input.getAttribute('aria-label')||'添加文件');
 input.classList.add('ui-upload-input');input.tabIndex=-1;
 const content=document.createElement('span');content.className='ui-upload-content';
 content.innerHTML=uiUploadIcon+'<span class="ui-upload-copy">将文件拖到此处，或 <span>点击添加</span></span><span class="ui-upload-hint">'+config.hint+'</span>';
 zone.replaceChildren(input,content);
 // 保留旧业务依赖的文件名节点，但不重复展示说明。
 if(filename){filename.hidden=true;zone.append(filename)}
 if(config.caption){const caption=document.createElement('span');caption.className='ui-upload-caption';caption.textContent=config.caption;content.prepend(caption)}
 const files=document.createElement('div');files.className='ui-upload-files';files.setAttribute('aria-live','polite');zone.append(files);
 const state={input,zone,files,content,config,depth:0};uiUploadControls.set(input,state);
 const receive=list=>{
  const chosen=[...list];let error='';
  if(!input.multiple&&chosen.length!==1)error='请选择一个文件';
  else if(chosen.some(file=>file.size>config.limit))error='文件超过大小限制';
  else if(chosen.reduce((sum,file)=>sum+file.size,0)>config.total)error='文件合计超过大小限制';
  else if(chosen.some(file=>!uiUploadAccepts(input,file)))error='文件格式不支持';
  const transfer=new DataTransfer();if(!error)chosen.forEach(file=>transfer.items.add(file));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  if(error){files.textContent=error;files.classList.add('is-error')}
 };
 zone.addEventListener('click',event=>{if(event.target!==input&&input.files.length&&!input.multiple)event.preventDefault()});
 zone.addEventListener('keydown',event=>{if(event.target===zone&&['Enter',' '].includes(event.key)){event.preventDefault();if(!input.files.length||input.multiple)input.click()}});
 zone.addEventListener('dragenter',event=>{event.preventDefault();state.depth++;zone.classList.add('is-dragging')});
 zone.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy'});
 zone.addEventListener('dragleave',()=>{if(--state.depth<=0){state.depth=0;zone.classList.remove('is-dragging')}});
 zone.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();state.depth=0;zone.classList.remove('is-dragging');if(!input.disabled&&(!input.files.length||input.multiple))receive(event.dataTransfer.files)});
 input.addEventListener('change',()=>uiUploadPaint(input));
 uiUploadPaint(input);
}
function uiUploadAccepts(input,file){
 const accept=input.accept.split(',').map(text=>text.trim()).filter(Boolean);
 return !accept.length||accept.some(type=>type.startsWith('.')?file.name.toLowerCase().endsWith(type.toLowerCase()):type.endsWith('/*')?file.type.startsWith(type.slice(0,-1)):file.type===type);
}
function uiUploadPaint(input){
 const state=uiUploadControls.get(input);if(!state)return;
 state.files.replaceChildren();state.files.classList.remove('is-error');
 state.content.hidden=input.files.length>0;state.zone.classList.toggle('has-file',input.files.length>0);
 [...input.files].forEach((file,index)=>{
  const row=document.createElement('div'),name=document.createElement('span'),size=document.createElement('small'),remove=document.createElement('button');
  row.className='ui-upload-file';name.textContent=file.name;name.title=file.name;size.textContent=uiUploadBytes(file.size);
  remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label','移除 '+file.name);
  remove.onclick=event=>{event.preventDefault();event.stopPropagation();if(input.disabled)return;const transfer=new DataTransfer();[...input.files].filter((_,i)=>i!==index).forEach(file=>transfer.items.add(file));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))};
  row.append(name,size,remove);state.files.append(row);
 });
}
function uiUploadEnhance(root){
 for(const input of root.querySelectorAll('input[type="file"]'))uiUploadMount(input);
 const dialog=root.matches('dialog,#dialog')?root:root.closest('dialog,#dialog');
 if(!dialog||!root.querySelector('input[type="file"]'))return;
 const title=dialog.querySelector('header h2,header h3,#dialogtitle')?.textContent||'';
 if(!/导入/.test(title))return;
 dialog.classList.add('ui-import-modal');
 if(dialog.dataset.uiImportPrepared==='true')return;
 dialog.dataset.uiImportPrepared='true';
 let template=[...dialog.querySelectorAll('button')].find(button=>/下载.*模板/.test(button.textContent));
 if(!template&&dialog.id==='klc-import-dialog'){
  template=document.createElement('button');template.type='button';template.className='link';template.textContent='下载模板';template.onclick=klcDownloadTemplate;
  dialog.querySelector('.klc-dialog-body').prepend(template);
 }
 if(template){
  const banner=document.createElement('div'),text=document.createElement('span');banner.className='ui-import-template';
  text.textContent='上传前请按模板格式填写内容';template.before(banner);banner.append(text,template);
 }
 // 仅删除重复填写说明，覆盖范围提示和导入失败结果由业务保留。
 dialog.querySelectorAll('.lt-import-intro>p,.ssi-import-rule,.gd-task-import-intro>p,.gd-task-entry-note:not([data-keep]),.cw-import-help>p,.cw-import-help>b,.cw-import-help>details').forEach(node=>node.remove());
 dialog.querySelectorAll('header>div>p,footer>span').forEach(node=>node.remove());
 if(dialog.id==='klc-import-dialog')for(const p of dialog.querySelectorAll('.klc-dialog-body>p:not(.klc-error):not(.klc-import-notice)'))p.remove();
 const body=dialog.querySelector('.cec-import-body,.lt-data-body,.klc-dialog-body,.gd-task-entry-body,#dialogbody');
 if(body&&template)body.prepend(template.closest('.ui-import-template'));
 if(dialog.id==='dialog'){
  const cancel=dialog.querySelector('#modalclose');if(cancel){cancel.textContent='取消';dialog.querySelector('#dialogactions').prepend(cancel)}
  dialog.querySelector('#cw-import-back')?.remove();dialog.querySelector('#dialogsub').textContent='';
 }
 const businessInput=[...dialog.querySelectorAll('input[type="file"]')].find(input=>uiUploadModules[input.id]||input.hasAttribute('data-gd-task-file'));
 const module=businessInput?.dataset.uploadModule||uiUploadModules[businessInput?.id]||(businessInput?.hasAttribute('data-gd-task-file')?'任务':'');
 if(module){
  dialog.dataset.uiImportModule=module;
  const tools=dialog.querySelector('.ui-import-template');
  const personnelHint={'任务':'负责人请填写钉钉名称','成本预警':'采购人员请填写钉钉名称'}[module];
  if(tools&&personnelHint)tools.querySelector('span').textContent='上传前请按模板格式填写内容；'+personnelHint;
  if(tools&&!tools.querySelector('[data-ui-import-history]')){const button=document.createElement('button');button.type='button';button.className='link';button.textContent='导入记录';button.dataset.uiImportHistory=module;tools.append(button)}
 }
}
// 每个弹窗独立观察新增内容；不在全页面重绘时扫描文件控件。
function uiObserveUploadDialog(dialog){
 const observer=new MutationObserver(records=>{
  if(!records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&[...(node.matches('input[type=file]')?[node]:[]),...node.querySelectorAll('input[type=file]')].some(input=>!uiUploadControls.has(input)))))return;
  dialog.removeAttribute('data-ui-import-prepared');uiUploadEnhance(dialog);
 });
 observer.observe(dialog,{childList:true,subtree:true});uiUploadEnhance(dialog);
}
for(const dialog of document.querySelectorAll('dialog,#dialog'))uiObserveUploadDialog(dialog);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('dialog'))uiObserveUploadDialog(node)}).observe(document.body,{childList:true});
