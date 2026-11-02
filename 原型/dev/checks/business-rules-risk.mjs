import {shopPreview} from './shop-preview.mjs';
import {lossPreview} from './loss-preview.mjs';
import {stockPreview} from './stock-preview.mjs';
import {returnPreview} from './return-preview.mjs';
export async function businessRuleRisk(page){
 await shopPreview(page);await lossPreview(page);await stockPreview(page);await returnPreview(page);
}
