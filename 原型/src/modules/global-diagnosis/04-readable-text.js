// 保留原段落，仅对明确编号分项换行；普通句号、分号不自动拆段。
function gdReadableText(value){
 return String(value??'').replace(/\r\n?/g,'\n')
  .replace(/(^|[\s：:，,])((?:[1-9]\d?[、)）]|[1-9]\d?\.(?!\d)|[一二三四五六七八九十]+[、)）]))[ \t]*/g,(_,before,mark)=>before.replace(/[ \t]+$/,'')+(before.endsWith('\n')||!before?'':'\n')+mark)
  .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
// 数值与紧随的单位作为一个阅读单元，保留原文和普通句子的自然换行。
function gdReadableMarkup(value){
 return esc(gdReadableText(value)).replace(/[+−-]?\d+(?:,\d{3})*(?:\.\d+)?[ \t]?(?:万元|元|w|件|天|次|分|%)/g,'<span class="gd-inline-value">$&</span>');
}
function gdProseMarkup(value){return '<div class="gd-readable-text">'+gdReadableMarkup(value)+'</div>'}
