// 主动协同演示：来源仅记录准备工作，协同建议不等同于已发生阻塞或自动下发任务。
function gdCoordinationSamples(objects,record){
 const material=[
  record('coord-material-engineering',objects.product,'王磊','替代物料验证','替代料规格已整理，拟安排替代料小批验证，准备试装及性能验证项目。'),
  record('coord-material-purchase',objects.product,'唐琪','替代物料试样','已取得替代料试样报价，准备确认试样数量和交样日期。'),
  record('coord-material-quality',objects.product,'刘畅','替代物料检验','准备按现行物料的检验要求整理替代料验证项目，记录检验结论。')
 ];
 const support=[
  record('coord-support-product',objects.launch,'林悦','新品使用说明','正在整理新品使用说明初稿和常见问题，准备汇总对外说明内容。'),
  record('coord-support-engineering',objects.launch,'王磊','新品技术说明','正在整理新品技术参数及使用边界，准备提供使用说明中的技术内容。'),
  record('coord-support-quality',objects.launch,'刘畅','新品试用反馈','正在整理试用反馈中的使用注意事项和故障排查要点，准备形成参考内容。')
 ];
 return [
  {id:'work-coordination-material-trial',kind:'blocker',coordinationType:'proactive',object:objects.product,department:'研发中心',priority:'P2',
   title:'衔接替代物料小批验证',summary:'对齐替代物料验证安排',
   problem:'研发准备小批验证，采购准备试样，品质整理检验项目。根据三方准备工作，识别出采购交样、研发试装与品质检验需要衔接，建议提前对齐样品版本、验证项目及交接节点。',
   problemSource:{sourceId:'coord-material-engineering',quote:'拟安排替代料小批验证'},sources:material,
   rolePlans:[
    ['王磊','与采购、品质对齐替代料规格和样品版本，确认试装及性能验证项目。','已对齐样品版本和验证项目。'],
    ['唐琪','按研发、品质的样品要求确认试样数量与交样日期，反馈试用批次。','已反馈试样数量、交样日期和试用批次。'],
    ['刘畅','与研发确认检验要求及判定标准，约定验证结论回传节点。','已确认检验要求、判定标准和结论回传节点。']
   ]},
  {id:'work-coordination-launch-support',kind:'blocker',coordinationType:'proactive',object:objects.launch,department:'产品中心',priority:'P2',
   title:'对齐新品使用说明与售后口径',summary:'衔接新品说明与售后口径',
   problem:'产品、研发、品质分别准备使用说明、技术内容和试用反馈。三份内容将用于同一新品的对外说明与问题答复，建议跨部门共同核对使用边界、注意事项和排查步骤，并统一说明版本。',
   problemSource:{sourceId:'coord-support-product',quote:'正在整理新品使用说明初稿和常见问题'},sources:support,
   rolePlans:[
    ['林悦','汇总研发、品质的确认内容，统一使用说明与常见问题答复版本。','已形成各方确认的使用说明与答复版本。'],
    ['王磊','核对技术参数及使用边界，与产品中心确认说明中的技术表述。','已确认技术参数、使用边界及对应表述。'],
    ['刘畅','核对试用注意事项及故障排查步骤，与产品中心对齐问题答复口径。','已确认注意事项、排查步骤和问题答复口径。']
   ]}
 ];
}
