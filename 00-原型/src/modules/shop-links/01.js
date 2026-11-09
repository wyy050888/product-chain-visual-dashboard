

// Pinduoduo product-link diagnostics: only explicit red rankings qualify.
function brPddLinks(shop){
 if(shop.channel!=='拼多多')return [];
 const labels=['近30天用户品质评价分排名','近30天品质退款率','近30天品质求助平台率','近30天品质文本情感分'];
 return Array.from({length:9},(_,i)=>{
  const product=names[shop.chain][i%names[shop.chain].length],seed=shop.id+i;
  const metrics=labels.map((name,j)=>{
   const abnormal=i%4!==0&&(j===(seed%4)||(i%3===1&&j===3));
   const thirdRed=abnormal&&i%3!==2,mainRed=abnormal&&i%3!==1;
   return {name,value:j===0?(32+i*2.18).toFixed(1)+'%':j===1?(i%4===0?.00:1.05+i*.32).toFixed(1)+'%':j===2?(1.7+i*.28).toFixed(1)+'%':(1.12+i*.13).toFixed(2)+'分',thirdRed,mainRed,third:thirdRed?'处于同行后30%':j===0?'--':'已超过50%同行',main:mainRed?(i%2?'处于同行后30%':'处于同行后10%'):j===0?'--':'已超过50%同行'};
  });
  return {id:'PDD-DEMO-'+shop.id+'-'+String(i+1).padStart(3,'0'),name:product+(i>=6?' · 升级款':''),product,model:sampleSpuByName(product)?.model||'—',category:chains[shop.chain],thirdCategory:product,mainCategory:chains[shop.chain],thirdScore:i%4===0?'已超过50%同行':'需改善',mainScore:i%4===0?'已超过50%同行':'需改善',metrics};
 });
}
function brPddAbnormalLinks(shop){return brPddLinks(shop).map(link=>({...link,metrics:link.metrics.filter(m=>m.thirdRed||m.mainRed)})).filter(link=>link.metrics.length)}
function brPddPanel(shop){
 const rows=brPddAbnormalLinks(shop),count=rows.reduce((n,r)=>n+r.metrics.length,0),cutoff=bounds().cutoff;
 return `<section class="pdd-link-panel" aria-label="拼多多产品链接异常"><div class="pdd-link-heading"><h3>产品链接异常 <span class="tag red">${rows.length} 条链接</span></h3><span class="muted">${shiftDate(cutoff,-29)} — ${cutoff} · 演示数据</span></div><p class="pdd-link-note">仅展示按三级分类或主营链群排序标红的链接，共 ${count} 项异常；全部异常链接均在下方展示。</p>${rows.length?`<div class="pdd-link-scroll"><table class="pdd-link-table"><thead><tr>${['商品信息','综合分（按三级分类）','综合分（按主营链群）','考核指标','商品表现','排序（按三级分类）','排序（按主营链群）'].map(n=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${rows.map(link=>link.metrics.map((m,i)=>`<tr data-pdd-link="${link.id}">${i===0?`<td rowspan="${link.metrics.length}"><div class="pdd-link-product">${riskThumbnail(link.product)}<div><b>${esc(link.name)}</b><small>ID：${link.id}</small><small>型号：${link.model}</small><small>三级分类：${esc(link.thirdCategory)}</small><small>主营链群：${esc(link.mainCategory)}</small></div></div></td><td rowspan="${link.metrics.length}">${link.thirdScore}</td><td rowspan="${link.metrics.length}">${link.mainScore}</td>`:''}<td>${m.name}</td><td>${m.value}</td><td class="${m.thirdRed?'red pdd-rank-alert':'green'}" data-pdd-rank="third" data-abnormal="${m.thirdRed}">${m.third}</td><td class="${m.mainRed?'red pdd-rank-alert':'green'}" data-pdd-rank="main" data-abnormal="${m.mainRed}">${m.main}</td></tr>`).join('')).join('')}</tbody></table></div>`:'<div class="dp-empty green">当前无链群排序标红的产品链接</div>'}<div class="pdd-link-advice"><b>AI 链接处理建议</b><p>先按标红指标逐链接核对平台明细：品质退款排查异常批次与退货原因，平台求助优先处理未解决售后，评价与文本情感回查差评内容及商品描述。由店铺运营牵头，品质与客服协同，按链接 ID 留存整改证据，并复核两种链群排序是否恢复。</p></div></section>`;
}
const brPddOriginalDetail=riskDetail;
riskDetail=function(k,id){brPddOriginalDetail(k,id);if(k!==1)return;withPeriod('risk',()=>{const shop=brShopRows().find(r=>r.id===+id);if(shop?.channel==='拼多多')$('.risk-context')?.insertAdjacentHTML('afterend',brPddPanel(shop))})};
window.pddShopLinksSnapshot=id=>withPeriod('risk',()=>{const shop=brShopRows().find(r=>r.id===+id);return shop?{shop:shop.name,all:brPddLinks(shop),abnormal:brPddAbnormalLinks(shop)}:null});