// 单工作表导入，兼容年月合列/分列；行号始终对应用户原文件。
(() => {
  const app=GoalPrototype;
  const clean=value=>String(value??'').replace(/^\uFEFF/,'').replace(/\s/g,'').replace(/[（]/g,'(').replace(/[）]/g,')').replace(/^\*/,'');
  const extra=new Set(['原工作表','原行号','错误字段','错误原因']);
  function read(book,kind) {
    if(book.SheetNames.length!==1) throw new Error('文件只能包含一个工作表，请删除其他工作表后重新上传');
    const candidates=[];
    for(const name of book.SheetNames){
      const sheet=book.Sheets[name], matrix=app.entryImportData.matrix(sheet);
      if(!matrix.some(row=>row.some(value=>String(value??'').trim()))) throw new Error('文件中没有目标数据，请填写后重新上传');
      matrix.forEach((row,index)=>{
        if(['年份','月份'].includes(clean(row[0])) && row.some(value=>clean(value)==='产品名称(SPU)')) candidates.push({name,sheet,matrix,index});
      });
    }
    if(candidates.length>1) throw new Error('文件内存在多处表头，请只保留一处表头');
    if(!candidates.length) throw new Error('无法识别目标表头，请使用对应模板并保留完整表头');
    const {name,sheet,matrix,index}=candidates[0];
    const combined=clean(matrix[index][0])==='月份';
    const expected=app.entrySchema.headers(kind).slice(combined?1:0);
    const headers=[...matrix[index]];
    while(headers.length && (!clean(headers.at(-1)) || extra.has(clean(headers.at(-1))))) headers.pop();
    const rows=matrix.slice(index+1).map((cells,i)=>{
      const line=index+i+2;
      const values=cells.slice(0,headers.length);
      const match=String(values[0]??'').trim().match(/^(\d{4})\/(0[1-9]|1[0-2])$/);
      return {line,cells:combined?[match?.[1]||'',match?.[2]||values[0],...values.slice(1)]:values,invalidMonth:combined&&!match};
    }).filter(row=>row.cells.some(value=>String(value).trim()));
    const headerError=headers.length!==expected.length || expected.some((header,i)=>clean(headers[i])!==clean(header));
    return {headers,headerLine:index+1,rows,combined,headerError,matrix:[app.entrySchema.headers(kind),...rows.map(row=>row.cells)]};
  }
  app.importSource={read};
})();
