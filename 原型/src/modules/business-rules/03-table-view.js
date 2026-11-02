// 表格只组织展示；字段键、草稿、校验和业务判定继续使用原目录。
function brcTableConditionField(item,instance='table'){
 return `<div class="brc-field brc-condition-row brc-rule-cell" data-brc-row="${item.key}" data-brc-instance="${instance}"><div class="brc-rule-editor">${brcConditionControls(item,instance)}</div></div>`;
}
function brcTableField(key,instance='table'){
 const item=brcEditorByKey.get(key);
 if(item.kind==='condition')return brcTableConditionField(item,instance);
 return `<div class="brc-table-parameter brc-number-field">${brcNumericInput(item,brcDraft[key],'a',instance)}<span class="brc-unit">${esc(brcEditorUnit(item.unit).label)}</span></div>`;
}
function brcConfigTable(title,headers,rows){
 return `<section class="brc-clause-group"><h4>${title}</h4><div class="brc-config-scroll"><table class="brc-config-table brc-columns-${headers.length}"><thead><tr>${headers.map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,...cells])=>`<tr><th scope="row">${label}</th>${cells.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function brcToneTitle(tone,colors=false){return `<span class="brc-table-tone"><i class="brc-result-dot ${tone}" aria-hidden="true"></i>${({green:'绿灯',yellow:'黄灯',red:colors?'红色':'红灯',gray:'灰色'})[tone]}</span>`}
function brcBandTableGroup(band){
 if(band.id.startsWith('score.'))return {id:'scores',title:'店铺评分判灯',label:band.id.slice(6)};
 if(band.id.startsWith('turn.'))return {id:'turnover',title:'库存周转率判灯',label:band.section.replace('库存周转率判灯','')};
 if(band.id.startsWith('return.'))return {id:'returns',title:'退货率红绿灯',label:band.id==='return.received'?'已收退偏差':'总退偏差'};
 return {id:band.id,title:band.section,label:band.section.replace(/判灯|判色/g,'')};
}
// 布局共用新品考核的逐行结构；比较条件与计算参数保留各自的编辑方式。
function brcMetricTable(title,headings,groups,tableClass=''){
 const grouped=groups.some(group=>group.label),result=headings.includes('判定结果');
 const body=groups.map(group=>`<tbody>${group.rows.map((row,index)=>{
  const item=brcEditorByKey.get(row.key),instance=row.instance||'table';
  const field=row.resultGroup?brcResultEditor(row.resultGroup,instance):brcTableField(item.key,instance);
  return `<tr>${grouped&&index===0?`<th scope="rowgroup" rowspan="${group.rows.length}">${group.label}</th>`:''}${result?`<th scope="row">${row.label}</th>`:''}<td>${field}</td></tr>`;
 }).join('')}</tbody>`).join('');
 const head='<div class="brc-condition-head"><span>条件</span><span>指标</span><span>连接条件</span><span>数值</span><span></span></div>';
 return brcNewGroup(title,`<div class="brc-config-scroll"><table class="brc-config-table brc-metric-table ${grouped?'brc-metric-grouped':''} ${tableClass}"><colgroup>${grouped?'<col class="brc-metric-group">':''}${result?'<col class="brc-metric-result">':''}<col></colgroup><thead><tr>${grouped?`<th scope="col">${headings[0]}</th>`:''}${result?'<th scope="col">判定结果</th>':''}<th scope="col">${head}</th></tr></thead>${body}</table></div>`);
}
function brcObjectSections(group){
 const blocks=new Map();
 for(const band of brcBands.filter(b=>b.group===group)){
  const layout=brcBandTableGroup(band);
  if(!blocks.has(layout.id))blocks.set(layout.id,{id:layout.id,title:layout.title,bands:[]});blocks.get(layout.id).bands.push({band,label:layout.label});
 }
 const sections=[...blocks.values()].map(block=>({...block,keys:block.bands.flatMap(({band})=>band.keys),render:()=>brcMetricTable('', ['指标','判定结果'],block.bands.map(({band,label})=>({
  label:esc(band.id.startsWith('score.')?label+'店铺分':band.id.startsWith('turn.')?label+'库存周转率':label),
  rows:['green','yellow','gray','red'].filter(tone=>band.tones.includes(tone)).map(tone=>({label:brcToneTitle(tone,band.style==='decline'),key:band.keys[band.tones.indexOf(tone)]}))
 })))}));
 const items=brcConfigurableItems.filter(item=>item.group===group&&!item.band),titles=[...new Set(items.map(item=>item.section))];
 for(const [index,title] of titles.entries()){
  const fields=items.filter(item=>item.section===title);
  sections.push({id:'fields-'+index,title,keys:fields.map(item=>item.key),render:()=>fields.every(item=>item.kind==='parameter')?brcConfigTable('',['规则','数值'],fields.map(item=>[esc(item.label),brcTableField(item.key)])):brcMetricTable('',['规则'],brcResultTableGroups(fields))});
 }
 // 已停用的品质风险触发不再提供配置入口，兼容层仍保留既有诊断键。
 return sections.filter(section=>group!=='products'||section.title!=='品质风险触发');
}
