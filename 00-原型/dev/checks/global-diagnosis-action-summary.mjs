import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyActionSummaryModel(){
 const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/02-action-summary.js',import.meta.url),'utf8'),box);
 for(const [action,summary] of [
  ['确认样机、检测和交付的统一排期，逐项明确负责人。','确认样机交付排期'],
  ['复核供方适配性，补充合格供应商。','补充合格供应商'],
  ['提交适用型号报价、采购条件、生效日期及单台降本测算。','跟工厂协商降本'],
  ['评估物料议价与装配优化，提交书面报价、降本测算及验证结论。','跟工厂协商降本'],
  ['向供方取得书面报价，核对工厂供价及降价传导，避免费用重复计入。','跟工厂协商降本'],
  ['提交结构优化方案、验证周期、成本变化及交付影响。','制定结构优化方案'],
  ['核实外部检测机构的资质、报价和预计出报告时间。','确认外部检测条件'],
  ['核实晚交原因及影响，反馈补交结果。','核实日志晚交原因'],
  ['【核对特殊样品】保留人工填写的具体执行步骤。','核对特殊样品'],
  ['联系渠道确认退换货安排，周五前反馈。','联系渠道确认退换货安排']
 ])assert.equal(box.gdActionSummary(action),summary);
}
