import {fisherFixture,fisherBundle} from './reviewed-fisher.mjs';
const cases=[];
for(const [ka,na,kb,nb] of [[8,10,2,10],[1,5,4,6],[0,3,0,2],[0,1,2,3],[5,5,0,5],[60,128,61,128]]){
 const v=await fisherFixture(ka,na,kb,nb);
 for(const alternative of ['greater','less','two-sided-probability-order'])cases.push(await fisherBundle(v,{alternative,familySize:3}));
}
console.log(JSON.stringify(cases));
