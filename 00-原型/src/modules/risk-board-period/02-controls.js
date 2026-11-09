// 普通三榜复用现有抽屉日/月/季/年控件，不注册第二套日期选择器。
function rpApplyBoardPeriod(kind,period){
 if(!rpTimedBoards.includes(kind))return;
 rpBoardPeriods[kind]={...period};renderRisks([kind]);
}
function rpMountBoardDateControls(root){
 if(!rpUsesBoardPeriods())return;
 for(const host of root.querySelectorAll('[data-rp-board-date]')){
  if(host.dataset.mounted)continue;host.dataset.mounted='true';
  const kind=+host.dataset.rpBoardDate,card=host.closest('[data-rp-board]'),head=card.querySelector('.rhead');
  if(kind===2)head.append(host);
  else{
   const actions=head.querySelector('.rp-quality-actions');
   if(actions)actions.prepend(host);
  }
  if(kind===6)rpMountReturnPeriod(host,rpBoardPeriod(kind),period=>rpApplyBoardPeriod(kind,period));
  else drawerMountPeriod(host,rpBoardPeriod(kind),period=>rpApplyBoardPeriod(kind,period),'rp-board-date-'+kind);
 }
}
