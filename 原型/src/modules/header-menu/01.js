// 部门页面沿用已有处理器；本模块仅管理下拉菜单及键盘焦点。
const chainTrigger = $('#chain-menu-trigger');
const chainMenu = $('#chain-menu');
const chainSwitch = chainTrigger.parentElement;
let chainCloseTimer = 0;
const chainMenuItems = () => [...chainMenu.querySelectorAll('button:not(:disabled)')];
function closeChainMenu(returnFocus = false) {
  clearTimeout(chainCloseTimer);
  chainMenu.hidden = true;
  chainTrigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) chainTrigger.focus();
}
function openChainMenu(focusItem = false) {
  clearTimeout(chainCloseTimer);
  chainMenu.hidden = false;
  chainTrigger.setAttribute('aria-expanded', 'true');
  if (focusItem) (chainMenu.querySelector('button.active:not(:disabled)') || chainMenuItems()[0])?.focus();
}
chainTrigger.addEventListener('click', () => {
  if (chainMenu.hidden) openChainMenu();
  else closeChainMenu();
});
chainTrigger.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    openChainMenu(true);
    if (event.key === 'ArrowUp') chainMenuItems().at(-1)?.focus();
  }
  if (event.key === 'Escape') closeChainMenu(true);
});
chainMenu.addEventListener('keydown', event => {
  const items = chainMenuItems(), index = items.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[target]?.focus();
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeChainMenu(true);
  }
});
chainMenu.addEventListener('click', event => {
  const item = event.target.closest('button:not(:disabled)');
  if (item) closeChainMenu(true);
});
chainSwitch.addEventListener('pointerenter', () => clearTimeout(chainCloseTimer));
chainSwitch.addEventListener('pointerleave', () => {
  chainCloseTimer = setTimeout(() => closeChainMenu(), 250);
});
chainSwitch.addEventListener('focusout', event => {
  if (event.relatedTarget && !chainSwitch.contains(event.relatedTarget)) closeChainMenu();
});
document.addEventListener('click', event => {
  if (!chainSwitch.contains(event.target)) closeChainMenu();
});
$('.head .brand').addEventListener('click', event => {
  event.preventDefault();
  dpNavButtons[0].click();
  closeChainMenu();
});
