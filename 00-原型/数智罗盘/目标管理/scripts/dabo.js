(() => {
  const app=GoalPrototype, {$, escape:esc}=app;
  let year=app.clock.parts().year, mode='month', selected=new Set(Array.from({length:12},(_,i)=>i+1)), folded=false, sorting=null;
  function buckets() {
    const groups=mode==='year' ? [Array.from({length:12},(_,i)=>i+1)] : mode==='quarter' ? [[1,2,3],[4,5,6],[7,8,9],[10,11,12]] : [...selected].sort((a,b)=>a-b).map(month=>[month]);
    return groups.map((months,i)=>({months,label:mode==='year'?`${year}年`:mode==='quarter'?`${year}/Q${i+1}`:`${year}/${String(months[0]).padStart(2,'0')}`}));
  }
  function render() {
    const periods=buckets(), code=$('#daboProduct').value, name=$('#daboEmployee').value.trim();
    const all=app.daboData.people.map(person=>({...person,cells:periods.map(period=>app.daboData.total(app.daboData.records(person.id,year,period.months,code)))}));
    let rows=all.filter(person=> (!name || person.name.includes(name)) && (name || !folded || !person.parent));
    if (sorting) rows.sort((a,b)=> {
      if (!a.parent || !b.parent) return !a.parent ? -1 : 1;
      const x=a.cells[sorting.index]?.[sorting.field],y=b.cells[sorting.index]?.[sorting.field];
      return x==null ? y==null?0:1 : y==null?-1:(x-y)*sorting.direction;
    });
    $('#daboMonths').hidden=mode!=='month';
    $('#daboMonths').innerHTML=`<label><input type="checkbox" data-dabo-all ${selected.size===12?'checked':''}>全年</label>`+Array.from({length:12},(_,i)=>`<label><input type="checkbox" data-dabo-month="${i+1}" ${selected.size!==12&&selected.has(i+1)?'checked':''}>${i+1}月</label>`).join('');
    $('#daboPeriods').querySelectorAll('button').forEach(button=>button.classList.toggle('on',button.dataset.daboPeriod===mode));
    $('#daboHead').innerHTML=`<tr><th rowspan="2" class="dabo-person">销售大区/员工 <button class="text-link" data-dabo-fold>${folded?'展开 ⌄':'收起 ⌃'}</button></th>${periods.map(period=>`<th colspan="2">${period.label}</th>`).join('')}<th rowspan="2" class="dabo-actions">操作</th></tr><tr>${periods.map((_,index)=>['gsv','profit'].map(field=>`<th><button data-dabo-sort="${field}" data-bucket="${index}">${field==='gsv'?'目标GSV':'目标利润率'} <small>${sorting?.field===field&&sorting.index===index?(sorting.direction===1?'↑':'↓'):'↕'}</small></button></th>`).join('')).join('')}</tr>`;
    $('#daboBody').innerHTML=rows.length?rows.map(person=>`<tr><td class="dabo-person"><div class="dabo-person-inner">${!person.parent?`<button class="dabo-fold" data-dabo-fold aria-label="${folded?'展开':'收起'}员工">${folded?'›':'⌄'}</button>`:'<span class="dabo-indent"></span>'}<span class="dabo-avatar">${esc(person.name.slice(-1))}</span><span>${esc(person.name)}</span></div></td>${person.cells.map(cell=>cell?`<td>${Number(cell.gsv.toFixed(2))}w</td><td>${Number(cell.profit.toFixed(2))}%</td>`:'<td class="dabo-unset">未设置</td><td class="dabo-unset">未设置</td>').join('')}<td class="dabo-actions"><button class="text-link" data-dabo-edit="${person.id}">${person.parent?'月目标设定与拆解':'月目标设定'}</button><button class="text-link" data-dabo-history="${person.id}">变更记录</button></td></tr>`).join(''):`<tr><td colspan="${periods.length*2+2}" class="empty-state">暂无匹配员工</td></tr>`;
  }
  function init() {
    $('#daboProduct').innerHTML='<option value="">请选择</option>'+app.entrySchema.catalog().products.map(row=>`<option value="${esc(row.productCode)}">${esc(row.product)}</option>`).join('');
    $('#daboYear').innerHTML=Array.from({length:app.clock.parts().year-2024+8},(_,i)=>2024+i).map(value=>`<option ${value===year?'selected':''}>${value}</option>`).join('');
    $('#daboEmployee').addEventListener('input',render);
    $('#daboProduct').addEventListener('change',render);
    $('#daboYear').addEventListener('change',event=>{year=Number(event.target.value);render();});
    $('#daboMonths').addEventListener('change',event=>{
      if (event.target.hasAttribute('data-dabo-all')) selected=new Set(event.target.checked?Array.from({length:12},(_,i)=>i+1):[app.clock.parts().month]);
      else { const month=Number(event.target.dataset.daboMonth); if (selected.size===12) selected=new Set([month]); else if (event.target.checked) selected.add(month); else if(selected.size>1) selected.delete(month); }
      sorting=null;render();
    });
    $('#dabo').addEventListener('click',event=>{
      const period=event.target.closest('[data-dabo-period]');
      if(period){mode=period.dataset.daboPeriod;sorting=null;render();}
      if(event.target.closest('[data-dabo-fold]')){folded=!folded;render();}
      const sort=event.target.closest('[data-dabo-sort]');
      if(sort){const index=Number(sort.dataset.bucket),field=sort.dataset.daboSort;sorting=sorting?.index===index&&sorting.field===field?(sorting.direction===1?null:{...sorting,direction:1}):{index,field,direction:-1};render();}
      // 月目标设定、拆解、变更记录仅保留展示；实际行为参照现有系统。
    });
    render();
  }
  app.dabo={init,render};
})();
