// 保留上一层真实节点和事件；背景副本只显示，不参与业务查询与交互。
const drawerFrames=[];
let drawerReplaceDepth=0,drawerMotion=null;
function drawerStopMotion(){drawerMotion?.cancel();drawerMotion=null}
function drawerEnter(){
 drawerStopMotion();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 drawerMotion=$('#dialog').animate([{transform:'translateX(40px)'},{transform:'translateX(0)'}],{duration:190,easing:'cubic-bezier(.2,.75,.25,1)'});
}
const drawerBack=document.createElement('button');
drawerBack.type='button';drawerBack.className='drawer-back';drawerBack.textContent='‹ 返回';
drawerBack.setAttribute('aria-label','返回上一层抽屉');drawerBack.hidden=true;
$('#dialog .dialoghead').prepend(drawerBack);
function drawerReplace(render){drawerReplaceDepth++;try{return render()}finally{drawerReplaceDepth--}}
function drawerAttributes(node){return [...node.attributes].map(a=>[a.name,a.value])}
function drawerRestoreAttributes(node,attrs){for(const a of [...node.attributes])node.removeAttribute(a.name);for(const [key,value] of attrs)node.setAttribute(key,value)}
function drawerDetach(node){const fragment=document.createDocumentFragment();fragment.append(...node.childNodes);return fragment}
function drawerSnapshot(){
 drawerStopMotion();
 const dialog=$('#dialog'),body=$('#dialogbody'),scroll=body.scrollTop,focus=document.activeElement;
 const background=dialog.cloneNode(true),preview=document.createElement('div');
 preview.className='drawer-parent-layer';preview.setAttribute('aria-hidden','true');preview.inert=true;
 background.classList.add('drawer-parent-preview');background.style.width=dialog.getBoundingClientRect().width+'px';
 // Shadow DOM 隔离背景中的 ID、表单与选择器，原业务只能访问当前层。
 const shadow=preview.attachShadow({mode:'closed'});
 // 构建阶段打包已加载的样式；此处不发起样式请求，不出现无样式背景。
 const styles=document.createElement('style');styles.textContent=drawerPreviewCss;shadow.append(styles,background);
 $('#overlay').insertBefore(preview,dialog);
 const frame={preview,body:drawerDetach(body),actions:drawerDetach($('#dialogactions')),tabs:drawerDetach(drawerNav),
  bodyAttrs:drawerAttributes(body),dialogAttrs:drawerAttributes(dialog),navAttrs:drawerAttributes(drawerNav),
  title:$('#dialogtitle').textContent,subtitle:drawerDetach($('#dialogsub')),view:drawerView,
  scroll,focus,modalModule,modalData,modalHeaders,
  detail:qrDetailState?{...qrDetailState}:null,quality:{...qrState},risk:{...rfState},shop:{...brState},returns:{...rrState}};
 drawerFrames.push(frame);
 // 保留快照中的长列表滚动位置，背景展示为当前浏览位置。
 background.querySelector('.dialogbody').scrollTop=frame.scroll;
}
function drawerUpdateDepth(){
 const dialog=$('#dialog');dialog.dataset.drawerDepth=drawerFrames.length;
 drawerBack.hidden=!drawerFrames.length;
 $('#close').setAttribute('aria-label',drawerFrames.length?'关闭当前抽屉并返回上一层':'关闭抽屉');
}
function drawerReturn(refresh){
 drawerStopMotion();
 const frame=drawerFrames.pop();if(!frame)return false;
 if($('#qr-handle-form'))qrPreserve();
 frame.preview.remove();
 const body=$('#dialogbody');
 drawerRestoreAttributes($('#dialog'),frame.dialogAttrs);drawerRestoreAttributes(body,frame.bodyAttrs);drawerRestoreAttributes(drawerNav,frame.navAttrs);
 body.replaceChildren(frame.body);$('#dialogactions').replaceChildren(frame.actions);drawerNav.replaceChildren(frame.tabs);
 $('#dialogtitle').textContent=frame.title;$('#dialogsub').replaceChildren(frame.subtitle);drawerView=frame.view;
 modalModule=frame.modalModule;modalData=frame.modalData;modalHeaders=frame.modalHeaders;
 qrDetailState=frame.detail;Object.assign(qrState,frame.quality);Object.assign(rfState,frame.risk);Object.assign(brState,frame.shop);Object.assign(rrState,frame.returns);
 drawerUpdateDepth();drawerQueueRefresh();body.scrollTop=frame.scroll;
 if(refresh)drawerReplace(refresh);
 queueMicrotask(()=>{body.scrollTop=frame.scroll;body.dispatchEvent(new Event('drawer:restored'));if(frame.focus?.isConnected)frame.focus.focus({preventScroll:true});else $('#close').focus({preventScroll:true})});
 return true;
}
const drawerStackOpen=openModal;
openModal=function(title,...args){
 const first=$('#overlay').hidden,nested=!first&&!drawerReplaceDepth&&drawerView?.title!==title;
 if(nested)drawerSnapshot();
 const result=drawerStackOpen(title,...args);drawerUpdateDepth();if(first||nested)drawerEnter();return result;
};
const drawerStackClose=closeModal;
closeModal=function(){
 if(drawerReturn())return;
 drawerStopMotion();
 if($('#qr-handle-form'))qrPreserve();
 drawerStackClose();drawerUpdateDepth();
};
drawerBack.onclick=()=>drawerReturn();
// 榜单标签、详情平台/时间重绘属于同层切换，不增加历史层级。
const drawerStackRankingSwitch=riskRankingSwitch;
riskRankingSwitch=function(...args){return drawerReplace(()=>drawerStackRankingSwitch(...args))};
const drawerStackQualityRender=qrRenderDetail;
qrRenderDetail=function(...args){return $('#qr-handle-form')?drawerReplace(()=>drawerStackQualityRender(...args)):drawerStackQualityRender(...args)};
// 捕获旧入口已绑定的关闭/返回事件，所有入口统一逐层返回。
document.addEventListener('click',e=>{
 if($('#overlay').hidden)return;
 const dialog=$('#dialog'),button=e.target.closest('button');
 const outside=!dialog.contains(e.target)&&$('#overlay').contains(e.target);
 const closes=button&&dialog.contains(button)&&(button.id==='close'||button.textContent.trim()==='关闭');
 const backs=drawerFrames.length&&button&&dialog.contains(button)&&/^返回/.test(button.textContent.trim());
 if(outside||closes||backs){e.preventDefault();e.stopImmediatePropagation();closeModal()}
},true);
document.addEventListener('keydown',e=>{
 if(!$('#overlay').hidden&&e.key==='Escape'&&!document.querySelector('dialog[open]')){
  e.preventDefault();e.stopImmediatePropagation();
  const picker=$('#dialog .nsp-spu-picker:popover-open');
  if(picker){picker.hidePopover();picker.previousElementSibling.focus({preventScroll:true});return}
  closeModal();
 }
},true);
new MutationObserver(()=>{
 if($('#overlay').hidden){for(const frame of drawerFrames)frame.preview.remove();drawerFrames.length=0;drawerUpdateDepth()}
}).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
