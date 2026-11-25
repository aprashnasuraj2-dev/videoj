const scope={subject:'beam_A',condition:'static_load',referenceFrame:'lab_A'};
const q=(quantityKind,value,unit,context=scope)=>({quantityKind,value,unit,scope:context});
export function scopeFixture(name){
 let left,right;
 if(name==='unit_equivalent'){left=q('length','1000','mm');right=q('length','1','m');}
 else if(name==='torque_energy'){left=q('torque','10','N*m');right=q('energy','10','J');}
 else if(name==='scope_changed'){left=q('stress','10','MPa');right=q('stress','10','MPa',{...scope,condition:'dynamic_load'});}
 else if(name==='same_scope_disagreement'){left=q('stress','10','MPa');right=q('stress','11','MPa');}
 else throw TypeError('Unknown fixture');
 return JSON.stringify({version:1,left,right});
}
