import assert from 'node:assert/strict';
import {stagnantPreview} from './stagnant-preview.mjs';
import {shortagePreview} from './shortage-preview.mjs';
import {qualityViolation} from './quality-violation.mjs';
import { cardSeasons } from './card-seasons.mjs';
import { returnPreview } from './return-preview.mjs';
import { stockPreview } from './stock-preview.mjs';
import { lossPreview } from './loss-preview.mjs';
import { shopPreview } from './shop-preview.mjs';
import { shopStatistics } from './shop-statistics.mjs';
import { shopFilters } from './shop-filters.mjs';
import { riskSort } from './risk-sort.mjs';
import { qualityPreview } from './quality-preview.mjs';
import { riskPlatformMenu } from './risk-platform-menu.mjs';
import { riskResponsive } from './risk-responsive.mjs';

export async function risk(page){
 await stagnantPreview(page);
 await shortagePreview(page);
 await riskResponsive(page);
 await riskPlatformMenu(page);
 await cardSeasons(page);
 assert.doesNotMatch(await page.locator('#riskrail').innerText(),/环比\s*[↑↓]?\s*0(?:\.0+)?%/);
 await page.locator('#riskrail [data-risk="0"]').click();
 for(const kind of [0,1,2,3,4,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  if(await page.locator('.rp-list-table .empty').count()){assert(await page.locator('.rp-list-table .empty').isVisible());continue}
  assert.equal(await page.locator('#dialogbody [data-rp-trend]').count(),0);
  if(kind!==1){const headers=await page.locator('.rp-list-table th').allTextContents(),season=headers.indexOf('季品');assert(season>0);assert.equal(headers[season-1],'类目');const values=await page.locator('.rp-list-table tbody tr').evaluateAll((rows,index)=>rows.map(row=>[row.cells[index-1].textContent,row.cells[index].textContent]),season);assert(values.every(([category,attribute])=>/类$/.test(category)&&['夏季品','冬季品','四季品'].includes(attribute)))}
  const cells=await page.locator('.rp-list-table').evaluate(t=>({head:t.querySelectorAll('th').length,rows:[...t.querySelectorAll('tbody tr')].map(r=>r.children.length)}));
  assert.doesNotMatch(await page.locator('.rp-list-table').innerText(),/环比\s*[↑↓]?\s*0(?:\.0+)?%/);
  assert.ok(cells.rows.length>0);assert.ok(cells.rows.every(n=>n===cells.head));
  assert.equal(await page.locator('[data-rp-filter="chain"]').getAttribute('aria-label'),kind===1?'核心主营产品类目':'类目');
 }
 await page.locator('#close').click();
 await riskSort(page);
 await qualityViolation(page);
 await qualityPreview(page);
 await shopFilters(page);
 await shopStatistics(page);
 await shopPreview(page);
 await lossPreview(page);
 await stockPreview(page);
 await returnPreview(page);
}
