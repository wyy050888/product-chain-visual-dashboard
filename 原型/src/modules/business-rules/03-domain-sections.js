// 只读规则说明复用统一的标题及定义行展示。
function brcReadOnlyRules(title,rows){return brcNewGroup(title,`<dl class="brc-rule-definitions">${rows.map(([term,text])=>`<div><dt>${esc(term)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl>`)}
