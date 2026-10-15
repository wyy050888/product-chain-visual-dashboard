// 描述只在展示层整理；不重算历史事实、不改写已下发或手工编辑的原始内容。
function upTodoDescriptionParts(task){
 const text=String(task.description||'').replace(/\r\n?/g,'\n').trim();
 if(!text)return [];
 const automatic=task.source!=='manual'&&(task.basis?.length||/事实依据|判断理由|统计期间/.test(text));
 if(!automatic)return [{kind:'text',label:'',items:text.split(/\n\s*\n/).filter(Boolean)}];
 const groups=new Map(),seen=new Map();
 const add=(kind,label,value)=>{
  if(!groups.has(kind)){groups.set(kind,{kind,label,items:[]});seen.set(kind,new Set())}
  for(const raw of value.split(/\n+|(?<=[。！？])\s*/)){
   const line=raw.trim(),key=line.replace(/\s/g,'');
   if(!line||seen.get(kind).has(key))continue;
   seen.get(kind).add(key);groups.get(kind).items.push(line);
  }
 };
 const pattern=/(事实依据(?:（[^）]*）)?|判断理由|统计期间|分析口径)[：:][ \t]*/g;
 const markers=[...text.matchAll(pattern)];
 const consume=(label,value)=>{
  if(label==='统计期间'){
   // 兼容旧版“日期后直接重复整段依据”的拼接，不把后续正文当日期。
   const date=value.match(/^\s*\d{4}-\d{2}-\d{2}\s*[—–~至]\s*\d{4}-\d{2}-\d{2}/);
   if(date){add('period',label,date[0]);if(value.slice(date[0].length).trim())add('facts','事实依据',value.slice(date[0].length));return}
  }
  const kind=label==='判断理由'?'reason':label==='统计期间'?'period':label==='分析口径'?'scope':'facts';
  add(kind,label,value);
 };
 if(!markers.length)add('facts','事实依据',text);
 else{
  if(markers[0].index>0)add('facts','事实依据',text.slice(0,markers[0].index));
  markers.forEach((match,i)=>consume(match[1],text.slice(match.index+match[0].length,markers[i+1]?.index??text.length)));
 }
 return ['facts','reason','scope','period'].map(key=>groups.get(key)).filter(g=>g?.items.length);
}
function upTodoDescriptionMarkup(task){
 const parts=upTodoDescriptionParts(task);
 if(!parts.length)return '—';
 return `<span class="up-todo-problem">${parts.map(g=>`<span class="up-todo-problem-group ${g.kind}">${g.label?`<span class="up-todo-problem-label">${esc(g.label)}：</span>`:''}${g.items.map(line=>`<span class="up-todo-problem-line">${esc(line)}</span>`).join('')}</span>`).join('')}</span>`;
}
function upTodoDescriptionText(task){
 return upTodoDescriptionParts(task).map(g=>(g.label?g.label+'：\n':'')+g.items.join('\n')).join('\n\n')||'—';
}
