// 普通三榜复用现有抽屉日/月/季/年控件，不注册第二套日期选择器。
let rpViolationDayRange=null;
function rpApplyBoardPeriod(kind,period){
 if(!rpTimedBoards.includes(kind))return;
 if(kind===0&&period.mode==='day')rpViolationDayRange=periodShortText(period)==='近30天'?null:{start:period.start,end:period.end};
 rpBoardPeriods[kind]={...period};renderRisks([kind]);
}
function rpMountBoardDateControls(root){
 if(!rpUsesBoardPeriods())return;
 for(const host of root.querySelectorAll('[data-rp-board-date]')){
  if(host.dataset.mounted)continue;host.dataset.mounted='true';
  const kind=+host.dataset.rpBoardDate,card=host.closest('[data-rp-board]'),head=card.querySelector('.rhead');
  if(kind===0)head.querySelector('h3').after(host);
  else if(kind===2)head.append(host);
  else{
   const actions=head.querySelector('.rp-quality-actions');
   if(actions)actions.prepend(host);
  }
  const period=rpBoardPeriod(kind),apply=next=>rpApplyBoardPeriod(kind,next);
  if([6,8].includes(kind))rpMountReturnPeriod(host,period,apply,kind);
  else{
   const dayRange=kind===0&&period.mode!=='day'?(rpViolationDayRange||rpDefaultBoardPeriod(kind)):undefined;
   drawerMountPeriod(host,period,apply,'rp-board-date-'+kind,'risk',dayRange);
  }
 }
}
