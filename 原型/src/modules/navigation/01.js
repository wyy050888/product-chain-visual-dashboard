
// The hidden global picker no longer controls the visible experience.
for(const id of moduleIds.filter(id=>id!=='ai'))localPeriods[id]=copyPeriod(globalPeriod);
// Sticky section navigation and scroll-aware selected state.
const navigationToolbar=document.createElement('div');navigationToolbar.className='navigation-toolbar';$('.jumpnav').before(navigationToolbar);navigationToolbar.append($('.jumpnav'));
const navigationActions=document.createElement('div');navigationActions.className='navigation-actions';navigationActions.append($('#rules'));navigationToolbar.append(navigationActions);




const jumpNavigation=$('.jumpnav'),jumpLinks=[...jumpNavigation.querySelectorAll('a')];
function updateNavigation(){const top=navigationToolbar.getBoundingClientRect().bottom+20;let current=moduleIds[0];for(const id of moduleIds){if($('#'+id).getBoundingClientRect().top<=top)current=id;else break}for(const link of jumpLinks){const selected=link.hash==='#'+current;link.classList.toggle('is-current',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}const selected=jumpLinks.find(l=>l.hash==='#'+current);if(selected){const a=selected.getBoundingClientRect(),n=jumpNavigation.getBoundingClientRect();if(a.left<n.left||a.right>n.right)jumpNavigation.scrollLeft+=a.left-n.left-12}}
let navigationFrame=0;window.addEventListener('scroll',()=>{if(navigationFrame)return;navigationFrame=requestAnimationFrame(()=>{navigationFrame=0;updateNavigation()})},{passive:true});
new ResizeObserver(()=>{document.documentElement.style.setProperty('--dashboard-anchor-offset',(navigationToolbar.offsetHeight+$('.head').offsetHeight+18)+'px');updateNavigation()}).observe(navigationToolbar);
requestAnimationFrame(updateNavigation);