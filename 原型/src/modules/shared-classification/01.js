

// One classification source for the matrix, category lists and AI summary.
function matrixAnalysisHTML(rows){
 const groups=[['A','高销高利','稳住核心供给，优先复制成熟产品。'],['B','高销低利','优先拆解成本与退货损耗，提升单品利润。'],['C','低销高利','小范围验证渠道与投放，提高动销规模。'],['D','低销低利','逐个评估整改、清库及下市，控制继续投入。']];
 const counts=Object.fromEntries(['A','B','C','D'].map(g=>[g,rows.filter(p=>category(p)===g).length]));
 const pct=n=>rows.length?fmt(n/rows.length*100,1)+'%':'0.0%';
 const priority=counts.B+counts.D;
 return `<div class="matrix-ai-heading"><span class="ai-logo">✧ AI</span><h3>AI 分析总结</h3><span>共 ${rows.length} 个产品</span></div><div class="matrix-ai-counts">${groups.map(([g,name,advice])=>`<div class="matrix-ai-group ${g}" data-matrix-summary-grade="${g}" data-count="${counts[g]}"><div><b>${g} ${name}</b><span>${pct(counts[g])}</span></div><strong>${counts[g]}<small> 个</small></strong><p>${counts[g]?advice:'当前筛选范围暂无此类产品。'}</p></div>`).join('')}</div><div class="matrix-ai-conclusion">${rows.length?`<b>经营关注：</b>B、D 类共 <strong>${priority} 个</strong>，占 ${pct(priority)}；${priority?'建议优先推进低利润产品的降本与退货治理。':'当前暂无 B、D 类低利润产品，持续跟踪经营表现。'}<br>A、C 类共 ${counts.A+counts.C} 个，可结合供给和渠道能力稳步放量。`:'当前筛选范围暂无产品，调整时间或筛选条件后查看分析。'}</div>`;
}
const renderMatrixBeforeInsights=renderMatrix;
renderMatrix=function(){
 renderMatrixBeforeInsights();
 let panel=$('#matrix-ai-summary');
 if(!panel){panel=document.createElement('div');panel.id='matrix-ai-summary';panel.className='matrix-ai-summary';$('#matrix .matrixplot').append(panel)}
 withPeriod('matrix',()=>{panel.innerHTML=matrixAnalysisHTML(productRows(false))});
};