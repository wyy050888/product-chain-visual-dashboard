// 人员大盘的演示归属。按 SPU 标识关联产品，区分同型号的不同产品。
const pcResponsibilitySamples={
 环境:{people:['张泽昆','刘萱','张晓阳','姚栋'],products:{'SPU-SOURCE-003':'张晓阳'}},
 清洁:{people:['潘东跃','刘萱','孟森祥'],products:{'SPU-SOURCE-009':'潘东跃','SPU-SOURCE-036':'孟森祥'}},
 厨电:{people:['刘萱','姚栋','孟森祥','侯佳莉'],products:{'SPU-SOURCE-043':'侯佳莉'}},
 '个护&健康':{people:['姚栋','刘萱'],products:{'SPU-SOURCE-011':'姚栋'}}
};
function pcMetricManagerNames(chain){
 const verified=pcActiveProjectSnapshot()?.people[chain]??{};
 return [...new Set([...(pcResponsibilitySamples[chain]?.people??[]),...Object.keys(verified)])];
}
