// 拼多多只读取现有核心链接考核，不借用其他平台评分或把同行排名当指标原值。
function sdPddAssessment(shop,end=DATA_CUTOFF){
 const groups=rpPddLinkGroups(shop,end),total=groups.all.length,red=groups.red.length,yellow=groups.yellow.length,unknown=groups.unknown.length;
 const normal=total-red-yellow-unknown,start=shiftDate(end,-29);
 const text=total?'截至'+end+'近30日（'+start+' — '+end+'）核心链接考核：'+red+'条红灯链接、'+yellow+'条黄灯链接'+(unknown?'、'+unknown+'条待补数据链接':'')+'，共配置'+total+'条；'+(red||yellow?'按链接复核六项考核，不直接认定商品缺陷或具体岗位责任。':unknown?'考核数据未齐全，待补数据链接不视为正常。':'当前有效考核未触发异常，不代表其他经营环节均正常。'):'截至'+end+'未配置核心链接，无法判断链接考核状态；不能当作全部正常。';
 return {total,red,yellow,unknown,normal,start,end,text};
}
function sdPddPromptRules(){
 return '拼多多使用本店已配置核心链接的近30日考核：品质退款率、品质求助平台率、品质文本情感分分别按三级类目和主营类目形成六项。单项异常原值'+brcDescribe('shops.pddValue')+'；六项异常命中数'+brcDescribe('shops.pddCount')+'为红灯，存在异常但未达到红灯条件为黄灯。六项数据未齐全时为待补数据，不按0或正常处理；未配置核心链接不代表没有风险。同行排序文字只用于相对位置，不把“已超越30%同行”“处于同行后30%”当作退款率、原始情感分或异常命中条件。使用已有分类，不根据排名文字重新判灯。该规则是系统业务配置，不称为最新官方规则。';
}

// 从指标意义推到经营风险，保留原有取数与判灯口径。
function sdPddAnalysisRequirement(){
 return '核心链接：从平台保障商品品质、消费体验和纠纷处理的角度分析。品质退款率观察因品质问题申请退款的情况；品质求助平台率观察品质纠纷升级至平台求助的情况；品质文本情感分观察品质相关文本中的用户感受。三级类目和主营类目是同三项指标的两个比较范围，不将六项考核视为六个独立问题。核对监控范围、红黄灯数量、待补数据及异常链接命中项，解释异常反映的品质、售后及口碑风险，结合违规处置和成交变化，判断整改优先级及流量、活动资格风险。不能只复述红黄灯数量；风险与已发生的限制分开，没有实际处置记录时不认定已被限流或取消活动资格。保留近30日窗口和数据日期，不将它扩成全历史累计；无历史考核快照时，不推断灯色升降。';
}
