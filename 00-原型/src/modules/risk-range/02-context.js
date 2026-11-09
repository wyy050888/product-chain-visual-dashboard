const riskRangeLabel=periodLabel,riskRangeWord=word,riskRangeKey=periodKey;
periodLabel=function(p=periodFor()){return p.mode==='day'?p.start+' — '+p.end:riskRangeLabel(p)};
word=function(p=periodFor()){return p.mode==='day'?'期间':riskRangeWord(p)};
periodKey=function(p=periodFor()){return p.mode==='day'?'day:'+p.start+':'+p.end:riskRangeKey(p)};
