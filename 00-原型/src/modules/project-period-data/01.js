
// Freeze monthly fixture plans before calculating day-level overdue status.
// Active projects carry over into a selected interval; they are not summed per day.
const pjOriginalProjects=projects;
projects=function(){
 const p=periodFor();if(p.mode!=='day'||activeModule!=='projects')return pjOriginalProjects();
 const saved=localPeriods.projects;
 let rows;try{localPeriods.projects={mode:'month',year:p.year,value:+p.end.slice(5,7)};rows=pjOriginalProjects()}finally{localPeriods.projects=saved}
 return rows.map(r=>{
  if(r.reference)return r;
  const completed=r.actual&&r.actual!=='—'&&r.actual<=p.end;
  const delay=completed?Math.max(0,aiFlowDayDiff(r.plan,r.actual)):r.status==='绿灯'?0:Math.max(0,aiFlowDayDiff(r.plan,p.end));
  return {...r,actual:completed?r.actual:'—',delay,status:completed?'绿灯':r.status==='绿灯'?'绿灯':delay>0?'红灯':'黄灯'};
 }).filter(r=>r.actual==='—'||r.actual>=p.start);
};