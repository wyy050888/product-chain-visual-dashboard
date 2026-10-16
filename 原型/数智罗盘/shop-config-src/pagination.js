/* List pagination is applied after filtering and sorting. */
function createPagination(root, onChange, {prefix = '',countId = 'total-count'} = {}) {
  const $ = selector => root.querySelector(selector.replace(/^#page-/,`#${prefix}page-`).replace(/^#total-count$/,`#${countId}`));
  let page = 1, size = 10, total = 0;
  const pages = () => Math.max(1,Math.ceil(total / size));
  function go(value) {
    const next = Number(value);
    if (!Number.isInteger(next)) { $('#page-jump').value = page; return; }
    page = Math.min(pages(),Math.max(1,next)); onChange();
  }
  $('#page-prev').addEventListener('click',() => go(page-1));
  $('#page-next').addEventListener('click',() => go(page+1));
  $('#page-numbers').addEventListener('click',event => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    const number = button.dataset.page; go(number);
    $(`[data-page="${number}"]`)?.focus({preventScroll:true});
  });
  $('#page-size').addEventListener('change',event => { size = Number(event.target.value); page = 1; onChange(); });
  $('#page-jump').addEventListener('change',event => go(event.target.value));
  $('#page-jump').addEventListener('keydown',event => {
    if (event.key === 'Enter') { event.preventDefault(); go(event.target.value); }
  });
  function slice(rows) {
    total = rows.length; page = Math.min(page,pages());
    $('#total-count').textContent = `共 ${total} 条`;
    $('#page-prev').disabled = page === 1; $('#page-next').disabled = page === pages();
    $('#page-jump').max = pages(); $('#page-jump').value = page; $('#page-jump').disabled = !total;
    $('#page-numbers').innerHTML = Array.from({length:pages()},(_,index) => {
      const number = index+1;
      return `<button type="button" data-page="${number}" aria-label="第 ${number} 页"${number === page ? ' aria-current="page"' : ''}>${number}</button>`;
    }).join('');
    return rows.slice((page-1)*size,page*size);
  }
  return {slice,reset:() => {page = 1;}};
}
