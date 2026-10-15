const screenButton=document.createElement('button');
screenButton.type='button';
screenButton.id='dashboard-fullscreen';
screenButton.className='btn small navigation-action';
screenButton.setAttribute('aria-label','全屏展示看板');
screenButton.setAttribute('aria-pressed','false');
screenButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span class="navigation-action-label">全屏展示</span>';
navigationActions.prepend(screenButton);
screenButton.onclick=async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch(_){toast('当前浏览器未允许全屏，可按 F11 进入全屏展示')}
};
document.addEventListener('fullscreenchange',()=>{
  const active=!!document.fullscreenElement;
  screenButton.querySelector('.navigation-action-label').textContent=active?'退出全屏':'全屏展示';
  screenButton.querySelector('path').setAttribute('d',active?'M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5':'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');
  screenButton.setAttribute('aria-label',active?'退出全屏展示':'全屏展示看板');
  screenButton.setAttribute('aria-pressed',String(active));
});


