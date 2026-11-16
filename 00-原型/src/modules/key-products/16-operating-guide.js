const kpmOperatingGuideActions={
 S:[
  ['持续迭代','储备下一代产品。'],
  ['成本目标','BOM 成本年度下降 5–8%。'],
  ['产品延展','开发衍生款和升级款，延长生命周期。'],
  ['资源保障','资源全面倾斜，保障供应链，加大投放杠杆。']
 ],
 A:[
  ['成本优化','优化供应链、包装、物流及投放 ROI。'],
  ['升级目标','提升产品品质和溢价，目标半年内升级为 S 级。'],
  ['预警条件','半年无法升级，判定为虚假爆品，及时预警。']
 ],
 B:[
  ['成本优化','降低供应链、包装和物流成本，优化投放 ROI。'],
  ['品质与售后','严控品控与售后，降低退货率。'],
  ['升级目标','迭代功能参数，提升产品力，目标半年内月销突破 300 万元，冲 A 级。']
 ],
 C:[
  ['默认淘汰','60 个下市 SKU 主要来自本级。'],
  ['一次挽救','降本并升级参数，3 个月无改善则下市。'],
  ['尾货清仓','尾货交由淘客渠道清仓处理。']
 ]
};

function kpmOperatingGuideProfile(root){
 const entries=[...root.children].map(node=>({node,key:node.dataset.kpmGuideGrade}));
 const tabs=entries.map(({key})=>({key,label:key+'级'}));
 return {root,entries,tabs};
}

document.addEventListener('click',event=>{
 if(!event.target.closest('#matrix.kpm-main [data-kpm-guide-open]'))return;
 const panels=kpmGradeOrder.map(level=>{
  const rows=kpmOperatingGuideActions[level].map(([topic,description])=>
   `<div><dt>${esc(topic)}</dt><dd>${esc(description)}</dd></div>`).join('');
  return `<section data-kpm-guide-grade="${level}" class="drawer-pane-off">
   <h3>${level}级 · ${esc(kpmGrades[level])}</h3><dl>${rows}</dl>
  </section>`;
 }).join('');
 openModal('经营动作指引',`<article class="kpm-operating-guide">${panels}</article>`,true);
});
