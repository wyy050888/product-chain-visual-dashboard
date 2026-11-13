// 成功口径由规则配置生成；浮层只展示公式、纳入范围和必要说明。
function nspRenderSuccessTooltip(host,annual){
 const period=nspSuccessPeriod(),conditions=brcSuccessConditions(annual,period.start);
 const append=(parent,tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.append(n);return n};
 const heading=append(host,'div','','nsp-tip-heading');append(heading,'h4',annual?'年度新品销售成功率':'季度新品销售成功率');append(heading,'span','目标 ≥'+brcNumber('new.successRate')+'%','nsp-tip-target');
 append(host,'div',annual?'年度成功数 ÷ 年度纳入数 × 100%':'本季首次成功数 ÷ 本季纳入数 × 100%','nsp-tip-formula');
 const list=append(host,'dl','','nsp-tip-definitions');
 const rows=annual?[
  ['数据','年度开始日至统计截止日，按年度标准独立复核'],['GSV折算','全年GSV门槛×当年上市日至12月31日的自然天数÷当年总天数；含上市当天，跨年滚入按全年门槛，利润率与总退率门槛不变'],['范围','截至所选日期，当年参加过季度考核的产品按产品简称去重，包含当年已成功及已出池产品']
 ]:[
  ['数据','季度开始日至统计截止日的当季业绩'],['纳入','本季新上市＋往季未成功滚入，按产品简称去重'],['滚动','未成功跨季度、跨年继续纳入；首次成功后不重复考核']
 ];
 rows.push(['特批',annual?'年度特批独立设置，不继承季度特批结果':'本季特批计为成功，后续季度不再纳入']);
 rows.push(['查询','通过“查看'+(annual?'年度':'季度')+'考核”或卡片数字查名单，不受成功状态和上市日期筛选限制']);
 for(const [k,v] of rows){append(list,'dt',k);append(list,'dd',v)}
 const section=append(host,'section','','nsp-tip-criteria');append(section,'h5',annual?'全年基准条件（GSV按上市天数折算）':'成功条件');const ul=append(section,'ul','');
 append(ul,'li','四季品：'+brcResultText(annual?'success-year':'success-quarter',conditions));
 append(ul,'li','夏季品、冬季品：'+brcResultText('success-season',conditions));
 append(host,'p','季度成功状态保留；年度结果独立，季度成功不代表年度成功。','nsp-tip-note');
}
function nspRenderStatusTooltip(host,annual){
 const h=document.createElement('div');h.className='nsp-tip-heading';const title=document.createElement('h4');title.textContent=annual?'年度是否成功':'是否成功';h.append(title);host.append(h);
 const p=document.createElement('p');p.className='nsp-tip-note';p.textContent=nspStatusRule(annual);host.append(p);
}
