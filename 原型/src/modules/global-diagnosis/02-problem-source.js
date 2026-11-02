// 短原文只用于核验归因；展示复用问题摘要，把来源融入同一段叙述。
function gdProblemSource(row){
 if(row.task?.source==='manual'||row.task?.descriptionVersion===2)return null;
 const ref=row.problemSource,source=ref&&(row.sources||[]).find(s=>s.id===ref.sourceId);
 const quote=String(ref?.quote||'').trim();
 if(!source||!quote||quote.length>48||!String(source.content||'').includes(quote))return null;
 if(row.kind!=='mismatch'&&source.objectKey&&row.object?.key&&source.objectKey!==row.object.key)return null;
 const date=gdSourceDate(source.date).slice(3),owner=source.logOwner||source.owner;
 const label=source.type||String(source.source||'').split('\n')[0].replace(/^钉钉/,'');
 const type=label.startsWith('项目进度')?'项目进度记录':label;
 if(!type)return null;
 const attribution=owner?owner+date+type+'反映':date+type+'显示';
 return {sourceId:source.id,quote,attribution};
}
function gdProblemText(row){
 const problem=row.causalProblem||row.problem||upTodoProblemSummary(row.task||{}),source=gdProblemSource(row);
 return gdReadableText(source?source.attribution+'，'+problem:problem);
}
function gdProblemMarkup(row){
 const source=gdProblemSource(row);
 return '<div class="gd-problem"'+(source?' data-gd-problem-source="'+esc(source.sourceId)+'"':'')+'>'+gdReadableMarkup(gdProblemText(row))+'</div>';
}
