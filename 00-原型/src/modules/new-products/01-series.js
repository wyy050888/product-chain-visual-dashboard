// 原型档案按简称 ID 明确维护成员；同名或相近型号不会自动合并。
const nspSeriesBySpu=new Map(nspSeriesSamples.flatMap(series=>series.spuIds.map(id=>[id,series])));
const nspProjectTypes=['自研','自选','-'];

function nspSeriesFor(product,cutoff){
 const record=nspSeriesBySpu.get(product.spuId);
 const members=record?record.spuIds.map(id=>upIdentity(id)).filter(Boolean).map(upProduct)
  .filter(member=>member.actualLaunch<=cutoff)
  .sort((a,b)=>a.actualLaunch.localeCompare(b.actualLaunch)||a.spuId.localeCompare(b.spuId)):[product];
 const first=members[0]||product;
 return {...first,seriesId:record?.id??first.spuId,shortName:record?.shortName??nspShortNameSamples[first.sourceRow]??first.name,
  developmentType:record?record.projectType??'-':nspProjectTypes.includes(first.developmentType)?first.developmentType:'-',members};
}

function nspMatchesProduct(product,query){
 return [product.shortName,...product.members.flatMap(member=>[member.name,member.model,member.spuCode])]
  .some(value=>String(value??'').toLocaleLowerCase().includes(query));
}

function nspSumSeriesFacts(summaries){
 if(summaries.length===1)return summaries[0];
 const [first]=summaries,totals=Object.fromEntries(upSummaryFields.map(key=>[key,summaries.reduce((sum,fact)=>sum+fact[key],0)]));
 const {sales,gsvCents}=totals;
 return {...totals,platform:first.platform,start:first.start,end:first.end,
  profitRate:gsvCents?totals.profitCents/gsvCents*100:null,
  returnRate:sales?totals.returned/sales*100:null,receivedRate:sales?totals.received/sales*100:null};
}

function nspMergeSeriesRows(members){
 const [first]=members,salesStates=[...new Set(members.map(member=>member.state))];
 if(members.length===1)return {...first,salesStates,guidePriceMaxCents:first.guidePriceCents};
 const prices=members.map(member=>member.guidePriceCents).filter(Number.isFinite);
 const priceFacts=nspSumSeriesFacts(members.map(member=>member.priceFacts));
 const stocks=members.map(member=>member.sellableStock);
 const sumStock=key=>stocks.every(stock=>Number.isFinite(stock[key]))?stocks.reduce((sum,stock)=>sum+stock[key],0):null;
 const returnTarget=members.every(member=>member.returnTarget===first.returnTarget)?first.returnTarget:null;
 return {...first,salesStates,priceFacts,priceCents:priceFacts.sales?Math.round(priceFacts.gmvCents/priceFacts.sales):null,
  guidePriceCents:prices.length?Math.min(...prices):null,guidePriceMaxCents:prices.length?Math.max(...prices):null,
  current:nspSumSeriesFacts(members.map(member=>member.current)),previous:nspSumSeriesFacts(members.map(member=>member.previous)),
  platformFacts:first.platformFacts.map((_,index)=>nspSumSeriesFacts(members.map(member=>member.platformFacts[index]))),
  salesChannels:qrPlatforms.filter(platform=>members.some(member=>member.salesChannels.includes(platform))),
  sellableStock:{warehouse:sumStock('warehouse'),warehouseValueCents:sumStock('warehouseValueCents')},returnTarget};
}
