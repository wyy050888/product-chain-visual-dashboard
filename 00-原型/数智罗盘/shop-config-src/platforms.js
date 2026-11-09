// Platform differences stay in one catalog; both tabs share configuration and history UI.
const kuaishouSeed = [
  ['4701467350','暖维福',null],
  ['4493134366','康佳丹粟专卖店','康佳'],
  ['5114414842','联想结固专卖店','联想'],
  ['4734458300','华帝VATTI厨房小电旗舰店','华帝'],
  ['4667856005','金正享巧专卖店','金正'],
  ['4723681635','创维具申','创维'],
  ['2095932707','康豆豆顾穗专卖店','康豆豆'],
  ['4370982076','爱视健茹誉专卖店','爱视健'],
  ['4711208763','苏泊尔润翁专卖店','苏泊尔'],
  ['4711239352','美的长奔专卖店','美的'],
  ['4393065761','创维梵森专卖店','创维'],
  ['4393086093','创维网良专卖店','创维'],
  ['4389479997','康佳KONKA威楷专卖店','康佳'],
  ['4383633806','创维顶脑专卖店','创维'],
  ['4868370113','苏泊尔厨房小电旗舰店','苏泊尔'],
  ['4417531940','苏泊尔蔚品专卖店','苏泊尔'],
  ['4433546033','康佳生活电器旗舰店','康佳'],
  ['4939543817','苏泊尔慕展专卖店','苏泊尔'],
  ['3583722334','康佳KONKA清洁电器旗舰店','康佳'],
  ['5041446095','帅达企业店','苏泊尔']
].map(([id,name,brand]) => ({id,name,brand,configs:[],updatedAt:null}));

const interestSeeds={douyin:ShopSettings.extendSeed(seed,'抖音'),kuaishou:ShopSettings.extendSeed(kuaishouSeed,'快手'),wechat:ShopSettings.extendSeed([
 {id:'wx-demo-001',name:'康佳生活电器视频号店',brand:'康佳',configs:[permanent('wx-owner','2025-01-01','邓新凯组','邓新凯')],updatedAt:null},
 {id:'wx-demo-002',name:'创维家电视频号店',brand:'创维',configs:[],updatedAt:null}
],'视频号')};
const goalSeeds=name=>ShopSettings.extendSeed(shopGoalSeed.shops.filter(s=>s.channel===name).map(s=>({id:s.shopId,name:s.shop,brand:s.brand,configs:[],updatedAt:null})),name);
const platformCatalog = {
 douyin:{name:'抖音店铺配置',label:'运营大区',placeholder:'请选择运营大区',allLabel:'全部大区',regions,seed:interestSeeds.douyin,storageKey:`shop-assignment-${scenarioVersion}`},
 kuaishou:{name:'快手店铺配置',label:'运营部门',placeholder:'请选择运营部门',allLabel:'全部部门',regions:['剪运一组','剪运二组','剪运三组'],seed:interestSeeds.kuaishou,storageKey:`shop-assignment-kuaishou-${scenarioVersion}`},
 wechat:{name:'视频号店铺配置',label:'运营部门',placeholder:'请选择运营部门',allLabel:'全部部门',regions:['邓新凯组','视频号二组','视频号三组'],seed:interestSeeds.wechat,storageKey:`shop-assignment-wechat-${scenarioVersion}`},
 ...Object.fromEntries([['tmall','天猫'],['jd','京东'],['pdd','拼多多']].map(([id,name])=>[id,{name:name+'店铺配置',label:'运营大区',placeholder:'请选择运营大区',allLabel:'全部大区',regions:[],seed:goalSeeds(name),readOnly:true,storageKey:`shop-assignment-${id}-${scenarioVersion}`}]))
};
const brandOptions=[...new Set(Object.values(platformCatalog).flatMap(p=>p.seed.map(s=>s.brand)).filter(Boolean))];
const requestedPlatform = new URLSearchParams(location.search).get('platform');
const platformId = Object.hasOwn(platformCatalog,requestedPlatform) ? requestedPlatform : 'douyin';
const activePlatform = platformCatalog[platformId];

function initializePlatformTabs(root) {
  root.querySelectorAll('[data-org-label]').forEach(el => { el.textContent = activePlatform.label; });
  root.querySelectorAll('[data-platform]').forEach(button => {
    const selected = button.dataset.platform === platformId;
    button.setAttribute('aria-selected',String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.addEventListener('click',() => {
      if (button.dataset.platform === platformId) return;
      const url = new URL(location.href); url.searchParams.set('platform',button.dataset.platform);
      location.assign(url.href);
    });
    button.addEventListener('keydown',event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...root.querySelectorAll('[data-platform]')];
      const target = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(tabs.indexOf(button)+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];
      target.focus(); target.click();
    });
  });
  root.querySelector('#assignment-panel').setAttribute('aria-labelledby',`tab-${platformId}`);
}
