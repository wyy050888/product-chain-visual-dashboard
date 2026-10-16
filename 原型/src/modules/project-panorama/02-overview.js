function ppHelp(label,text){return `<span class="metric-help" role="button" tabindex="0" aria-label="${esc(label)}说明" data-metric-rule="${esc(text)}"></span>`}
function ppLightValues(value){return value==='红黄灯'?['红灯','黄灯']:[value]}
function ppLightActive(value){const values=ppLightValues(value);return ppState.light.length===values.length&&values.every(light=>ppState.light.includes(light))}
function ppLink(kind,value,label,body='',type=''){
 const active=kind==='light'?ppLightActive(value):['type','category'].includes(kind)?ppState[kind].includes(value):ppState.link?.kind===kind&&ppState.link.value===value&&(!type||ppState.link.type===type);
 return `<button type="button" class="pp-link ${active?'selected':''}" data-pp-link="${kind}" data-value="${esc(value)}" data-type="${esc(type)}" aria-pressed="${active}">${label}${body}</button>`;
}
function ppOverview(rows){
 const ongoing=rows.filter(p=>p.projectState==='进行中'),c=ppCounts(ongoing),dimension=ppState.distribution;
 const keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 const groups=keys.map(key=>({key,...ppCounts(ongoing.filter(p=>p[dimension]===key))}));
 // 每组按自身三色合计归一化；没有项目时保留空底。
 const share=(group,count)=>count/Math.max(1,group.red+group.yellow+group.green)*100;
 return `<article class="pp-card pp-rate"><div class="pp-card-head"><h3>红黄灯率 ${ppHelp('红黄灯率','红黄灯率＝（红灯项目数＋黄灯项目数）÷进行中项目数。')}</h3><span>${c.total}个进行中项目</span></div>
 ${ppLink('light','红黄灯',`<span>红黄灯合计</span><strong>${c.rate(c.red+c.yellow)}</strong><small>${c.red+c.yellow} 个项目</small>`)}
 <div class="pp-rate-split">${[['红灯',c.red,'red'],['黄灯',c.yellow,'orange']].map(([name,count,color])=>ppLink('light',name,`<span><i class="dot ${color}"></i>${name}率</span><b class="${color}">${c.rate(count)}</b><small>${count} 个项目</small>`)).join('')}</div></article>
 <article class="pp-card pp-distribution"><div class="pp-card-head"><h3>进行中项目红绿灯分布</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯 <i class="dot green"></i>绿灯</span></div>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-distribution="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-bars">${groups.map(g=>ppLink(dimension,g.key,`<span class="pp-bar-label">${esc(g.key)}</span>`,`<span class="pp-bar-line"><span class="pp-track"><i class="pp-red" style="width:${share(g,g.red)}%"></i><i class="pp-yellow" style="width:${share(g,g.yellow)}%"></i><i class="pp-green" style="width:${share(g,g.green)}%"></i></span><span><b class="red">${g.red}</b> / <b class="orange">${g.yellow}</b> / <b class="green">${g.green}</b></span></span>`)).join('')}</div></article>
 ${ppDepartmentRiskChart(rows)}`;
}
