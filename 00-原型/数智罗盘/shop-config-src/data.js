/* Reporting fixtures, not production data. Every shop has an explicit initial configuration. */
const scenarioVersion = 'complete-year-v3';
const currentOperator = '系统租户管理员';
// Independent directories; supervisors are prototype fixtures, not region assignments.
const regions = ['抖音一区','抖音二区','抖音三区','抖音四区','晟彬','和草集','商务达播','商城运营部','其他'];
const supervisors = ['邓新凯','陈昱龙','赵明','杨潇鹏','蔡龙坤','王韶','王梦宇','郭东焕','贾顺席','程壹涵','李家煜','刘雪平','张航','周心宁','李欣'];
// Rename legacy display values across configurations, attribution snapshots and operation history.
// This is a directory correction, not a new business change.
function normalizeRegionNames(value) {
  if (!value || typeof value !== 'object') return;
  const aliases = {'一区':'抖音一区','二区':'抖音二区','三区':'抖音三区','四区':'抖音四区','视频号一组':'邓新凯组'};
  if (Object.hasOwn(aliases,value.region)) value.region = aliases[value.region];
  Object.values(value).forEach(normalizeRegionNames);
}
const permanent = (id, start, region, owner) => ({id, start, type: 'long', region, owner});
const season = (sm, sd, em, ed, region, owner) => ({sm, sd, em, ed, region, owner});
const yearly = (id, start, summerRegion, summerOwner, winterRegion, winterOwner) => ({
  id, start, type: 'annual', segments: [season(3, 1, 8, 31, summerRegion, summerOwner), season(9, 1, 2, 29, winterRegion, winterOwner)]
});
const seed = [
  {id:'100861001', updatedAt:'2026-09-23T16:30:00+08:00', name:'美的生活电器旗舰店', brand:'美的', configs:[yearly('life-annual','2025-01-01','抖音三区','杨潇鹏','抖音二区','陈昱龙')]},
  {id:'100861006', updatedAt:'2026-09-23T14:20:00+08:00', name:'创维环境电器旗舰店', brand:'创维', configs:[yearly('env-annual','2025-01-01','抖音四区','贾顺席','抖音三区','杨潇鹏'), permanent('env-next','2026-10-01','抖音四区','程壹涵')]},
  {id:'100861009', updatedAt:'2026-09-22T11:05:00+08:00', name:'苏泊尔润翁专卖店', brand:'苏泊尔', configs:[permanent('run-first','2025-01-01','抖音三区','蔡龙坤'), permanent('run-current','2026-09-05','抖音三区','杨潇鹏'), permanent('run-next','2026-10-01','抖音三区','王韶')]},
  {id:'100861008', updatedAt:'2026-09-21T15:40:00+08:00', name:'美的玥作专卖店', brand:'美的', configs:[yearly('yue-annual','2025-01-01','抖音三区','郭东焕','抖音四区','程壹涵')]},
  {id:'100861007', updatedAt:'2026-09-20T09:15:00+08:00', name:'创维冷暖电器旗舰店', brand:'创维', configs:[permanent('climate-current','2025-01-01','抖音二区','赵明'), {id:'climate-next',start:'2027-01-01',type:'annual',segments:[season(1,1,3,15,'抖音三区','王梦宇'),season(3,16,12,31,'抖音二区','赵明')]}]},
  {id:'100861002', updatedAt:'2026-09-19T17:25:00+08:00', name:'苏泊尔霖泌专卖店', brand:'苏泊尔', configs:[permanent('lin-first','2025-01-01','抖音四区','程壹涵'),permanent('lin-current','2026-08-18','抖音二区','赵明')]},
  {id:'100861003', updatedAt:'2026-09-18T10:50:00+08:00', name:'创维逢之瑾专卖店', brand:'创维', configs:[permanent('feng-first','2025-01-01','和草集','刘雪平'),permanent('feng-current','2026-09-01','抖音四区','贾顺席')]},
  {id:'100861004', updatedAt:'2026-09-17T14:10:00+08:00', name:'苏泊尔楷朋电器专卖店', brand:'苏泊尔', configs:[permanent('kai-first','2025-01-01','和草集','刘雪平'),permanent('kai-current','2026-09-01','抖音三区','蔡龙坤')]},
  {id:'100861005', updatedAt:'2026-09-16T09:35:00+08:00', name:'康佳奔起专卖店', brand:'康佳', configs:[permanent('kang-first','2025-01-01','抖音三区','王韶'),permanent('kang-current','2026-09-01','抖音二区','赵明')]},
  {id:'100861010', updatedAt:'2026-09-15T16:45:00+08:00', name:'苏泊尔岑楠专卖店', brand:'苏泊尔', configs:[permanent('cen-first','2025-01-01','抖音三区','杨潇鹏'),permanent('cen-current','2026-09-09','抖音三区','王韶')]}
];
// Second-page examples include stores with no brand or responsible configuration.
seed.push(
  {id:'100861011',name:'永盾',brand:null,updatedAt:null,configs:[]},
  {id:'100861012',name:'万奥',brand:null,updatedAt:null,configs:[]},
  {id:'100861013',name:'康豆豆冰帖专卖店',brand:'康豆豆',updatedAt:null,configs:[]},
  {id:'100861014',name:'爱视健闵联专卖店',brand:'爱视健',updatedAt:null,configs:[]},
  {id:'100861015',name:'勤旭小店',brand:'山水',updatedAt:null,configs:[]},
  {id:'100861016',name:'誉须',brand:'康佳',updatedAt:null,configs:[]},
  {id:'100861017',name:'创维捷沅专卖店',brand:'创维',updatedAt:null,configs:[]},
  {id:'100861018',name:'创维荣高专卖店',brand:'创维',updatedAt:null,configs:[]},
  {id:'100861019',name:'杉聪',brand:null,updatedAt:null,configs:[]},
  {id:'100861020',name:'创维誉嘉专卖店',brand:'创维',updatedAt:null,configs:[]}
);
// Explicit configuration-operation fixtures; these times differ from effective dates.
const seedChangeTimes = {
  'life-annual':'2024-12-27T16:30:00+08:00',
  'env-annual':'2024-12-27T14:20:00+08:00', 'env-next':'2026-09-23T14:20:00+08:00',
  'run-first':'2024-12-26T10:00:00+08:00', 'run-current':'2026-09-03T11:05:00+08:00', 'run-next':'2026-09-22T11:05:00+08:00',
  'yue-annual':'2024-12-26T15:40:00+08:00',
  'climate-current':'2024-12-25T09:15:00+08:00', 'climate-next':'2026-09-20T09:15:00+08:00',
  'lin-first':'2024-12-25T10:20:00+08:00', 'lin-current':'2026-08-14T17:25:00+08:00',
  'feng-first':'2024-12-24T10:50:00+08:00', 'feng-current':'2026-08-28T10:50:00+08:00',
  'kai-first':'2024-12-24T14:10:00+08:00', 'kai-current':'2026-08-28T14:10:00+08:00',
  'kang-first':'2024-12-23T09:35:00+08:00', 'kang-current':'2026-08-27T09:35:00+08:00',
  'cen-first':'2024-12-23T16:45:00+08:00', 'cen-current':'2026-09-07T16:45:00+08:00'
};
for (const shop of seed) for (const config of shop.configs) {
  config.changedBy = currentOperator;
  config.changedAt = seedChangeTimes[config.id];
}
