// 只比较有明确分工、完整抓取和可定位原文的材料；无材料不推断未工作。
function gdAnalyzeFocus(materials,range){
 const rows=[];
 for(const expected of materials.expectations){
  if(!expected.owner||!expected.role||!expected.topic||!expected.meeting||expected.meeting.owner!==expected.owner||expected.approvedSpecialty)continue;
  const start=[expected.start,range.start].sort().at(-1),end=range.end;
  if(start>end||expected.meeting.date>end||expected.risk?.range?.end<start)continue;
  const coverage=materials.coverage.find(c=>c.owner===expected.owner&&c.complete&&c.start<=start&&c.end>=end);
  if(!coverage)continue;
  const valid=materials.logs.filter(l=>l.submitted&&!l.missing&&l.date<=end),own=valid.filter(l=>l.owner===expected.owner&&l.date>=start);
  if(!own.length||own.some(l=>l.topics?.includes(expected.topic)))continue;
  const peers=valid.filter(l=>l.owner!==expected.owner&&l.date>=start&&l.topics?.includes(expected.topic));
  const history=valid.filter(l=>l.owner===expected.owner&&l.date>=expected.meeting.date&&l.date<start&&l.topics?.includes(expected.topic));
  let issueType,title,deviation;
  if(expected.mode==='direction'&&peers.length>0){
   issueType='focus-direction';title=expected.owner+'近期工作与项目交付重点疑似偏离';
   deviation='会议已明确本人参与交付评审；同期协作记录涉及该重点，本期本人抓取记录涉及其他工作，未见本次验收相关动作，需核实实际分工与优先级。';
  }else if(expected.mode==='risk'&&expected.risk?.active){
   issueType='focus-risk-response';title='高危产品未见'+expected.owner+'的应对记录';
   deviation='本人承担该产品风险复核职责，业务预警仍存在；本期已抓取日志未见该产品复核或整改验证记录，需核实是否已开展相关工作。';
  }else if(expected.mode==='interruption'&&expected.risk?.active&&history.length){
   issueType='focus-interruption';title=expected.owner+'的供方准入重点工作疑似中断';
   deviation='前期日志已记录启动准入资料核对，后续已抓取日志转为常规合同及台账工作，未见该项目继续推进记录，准入缺口仍存在，需核实推进情况。';
  }else continue;
  const chronological=records=>[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const relevant=chronological([...history,...own,...(expected.mode==='direction'?peers:[])]);
  const observed=chronological(own).map(l=>l.date+' · '+l.owner+'：'+l.progress).join('\n');
  const peerText=expected.mode==='direction'?'\n同期协作记录：\n'+chronological(peers).map(l=>l.date+' · '+l.owner+'：'+l.progress).join('\n'):'';
  const priorText=history.length?'前期记录：\n'+chronological(history).map(l=>l.date+' · '+l.owner+'：'+l.progress).join('\n')+'\n本期记录：\n':'';
  rows.push({id:expected.id,kind:'focus',issueType,title,source:expected.source,sourceName:expected.sourceName,objectName:expected.objectName,projectId:expected.projectId,spuId:expected.spuId,category:expected.category,owner:expected.owner,department:expected.department,date:end,due:expected.meeting.due,priority:expected.priority,status:'待核实',problem:deviation,impact:expected.risk?.text||'会议已明确本周交付重点及本人分工。',action:'核实已开展但未记录的工作及专项安排；如确认重点偏差，再调整工作优先级并跟进。',focusEvidence:{expected:expected.owner+' · '+expected.department+'\n明确分工：'+expected.role+'\n会议安排：'+expected.meeting.decision,observed:priorText+observed+peerText,deviation,meeting:expected.meeting,logs:relevant,risk:expected.risk,window:{start,end},coverage}});
 }
 return rows;
}
function gdFocusRows(context){
 const materials=gdFocusMaterials(context);
 for(const expected of materials.expectations)expected.sourceName=context.by(expected.source).name;
 materials.logs=gdReports(context,true);
 return gdAnalyzeFocus(materials,gdRange());
}
