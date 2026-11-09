// 库存总览、两表与产品库存卡片共用悬浮分布；移入浮层可继续阅读，离开后缓冲收起。
let ipRefurbDistribution=null,ipRefurbDistributionAnchor=null,ipRefurbDistributionPosition=null;
const ipRefurbDistributionHover=createTooltipHover(()=>ipRefurbDistribution,()=>ipRefurbDistributionAnchor,ipHideRefurbDistribution);
function ipHideRefurbDistribution(){
 ipRefurbDistributionHover.keep();
 if(ipRefurbDistribution?.matches(':popover-open'))ipRefurbDistribution.hidePopover();
 ipRefurbDistributionAnchor?.setAttribute('aria-expanded','false');ipRefurbDistributionAnchor?.removeAttribute('aria-describedby');ipRefurbDistributionAnchor=null;ipRefurbDistributionPosition=null;
}
function ipShowRefurbDistribution(anchor){
 ipRefurbDistributionHover.keep();
 if(ipRefurbDistributionAnchor===anchor&&ipRefurbDistribution?.matches(':popover-open'))return;
 const model=JSON.parse(anchor.dataset.ipRefurbSummary||'null');if(!model?.buckets)return;
 ipHideRefurbDistribution();
 if(!ipRefurbDistribution){
  ipRefurbDistribution=document.createElement('div');ipRefurbDistribution.id='ip-refurb-distribution';
  ipRefurbDistribution.className='ip-refurb-distribution';ipRefurbDistribution.setAttribute('popover','manual');
  ipRefurbDistribution.setAttribute('role','tooltip');ipRefurbDistribution.setAttribute('aria-labelledby','ip-refurb-distribution-title');
  document.body.append(ipRefurbDistribution);
 }
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 const panel=ipRefurbDistribution;panel.replaceChildren();
 const head=append(panel,'header',''),title=append(head,'h4',anchor.dataset.ipRefurbName+' · 翻新天数分布');title.id='ip-refurb-distribution-title';
 for(const bucket of model.buckets){
  const row=append(panel,'div','','ip-refurb-distribution-row');row.dataset.refurbBucket=bucket.key;
  append(row,'span',bucket.label);const track=append(row,'span','','ip-refurb-distribution-track'),bar=append(track,'i','');
  bar.style.width=(model.completed?Math.min(100,Math.max(0,bucket.count/model.completed*100)):0)+'%';track.setAttribute('aria-hidden','true');
  append(row,'b',fmt(bucket.count));
 }
 append(panel,'p','达标 '+fmt(model.onTime)+' / 已完成 '+fmt(model.completed)+' 单','stock-refurb-tip-summary');
 if(model.unknown)append(panel,'p','周期数据缺失 '+fmt(model.unknown)+' 单，闭环率暂不可计算','stock-refurb-tip-summary');
 if(!model.total)append(panel,'p','当前范围暂无已完成翻新单','stock-refurb-tip-summary');
 ipRefurbDistributionAnchor=anchor;anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-describedby',panel.id);panel.showPopover();
 const rect=anchor.getBoundingClientRect(),box=panel.getBoundingClientRect();
 ipRefurbDistributionPosition={left:rect.left,top:rect.top};
 panel.style.left=Math.max(8,Math.min(innerWidth-box.width-8,rect.left))+'px';
 panel.style.top=(rect.bottom+box.height+9<=innerHeight-8?rect.bottom+9:Math.max(8,rect.top-box.height-9))+'px';
}
document.addEventListener('pointerover',event=>{
 const anchor=event.target.closest?.('.ip-refurb-rate[data-ip-refurb-summary]');
 if(anchor)ipShowRefurbDistribution(anchor);
});
document.addEventListener('focusin',event=>{
 if(event.target.matches?.('.ip-refurb-rate[data-ip-refurb-summary]'))ipShowRefurbDistribution(event.target);
});
document.addEventListener('click',event=>{
 const anchor=event.target.closest('.ip-refurb-rate[data-ip-refurb-summary]');
 if(anchor)ipShowRefurbDistribution(anchor);else if(!ipRefurbDistribution?.contains(event.target))ipHideRefurbDistribution();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&ipRefurbDistribution?.matches(':popover-open')){event.preventDefault();event.stopImmediatePropagation();ipHideRefurbDistribution()}},true);
document.addEventListener('scroll',event=>{
 if(!ipRefurbDistributionAnchor||ipRefurbDistribution?.contains(event.target))return;
 // 忽略点击前自动滚动的延迟事件；只有触发点实际移位才关闭。
 const rect=ipRefurbDistributionAnchor.getBoundingClientRect(),before=ipRefurbDistributionPosition;
 if(!before||Math.abs(rect.left-before.left)>1||Math.abs(rect.top-before.top)>1)ipHideRefurbDistribution();
},true);
window.addEventListener('resize',ipHideRefurbDistribution);
