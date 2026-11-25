//! Narrow browser ABI for a locally built, trusted WASM module.
//! No pointer exchange, imported peer code, or arbitrary memory writes.
//! This ABI accepts the existing session's <=12 worlds and <=8 observations.
#[path="lib.rs"] mod lattice;
use std::cell::RefCell;
use lattice::{Analysis,Current,Decision};
thread_local! { static LAST: RefCell<Option<Analysis>> = const { RefCell::new(None) }; }
const INVALID:u32=u32::MAX;

#[no_mangle]
pub extern "C" fn support_analyze(n:u32,m:u32,sat:u32,no:u32,low:u64,high:u64,budget:u32)->u32{
    LAST.with(|state| {
        // Clear previous authority even if the new request is invalid.
        *state.borrow_mut()=None;
        if n==0||n>12||m>8||budget>256{return INVALID;}
        let all=(1u32<<n)-1;
        if sat&no!=0||(sat|no)&!all!=0{return INVALID;}
        let used_low=m.min(4)*12;
        let used_high=m.saturating_sub(4)*12;
        if low>>used_low!=0||high>>used_high!=0{return INVALID;}
        let mut decisions=Vec::with_capacity(n as usize);
        for i in 0..n{
            decisions.push(if sat&(1<<i)!=0{Decision::Satisfied}
            else if no&(1<<i)!=0{Decision::Refuted}else{Decision::Unresolved});
        }
        let mut compatibility=Vec::with_capacity(m as usize);
        for i in 0..m{
            let value=if i<4{(low>>(12*i))&0xfff}else{(high>>(12*(i-4)))&0xfff};
            compatibility.push(value);
        }
        match lattice::analyze(&decisions,&compatibility,budget as usize){
            Ok(result)=>{*state.borrow_mut()=Some(result);0},
            Err(_)=>INVALID,
        }
    })
}

// Scalar reads only. No cross-call user input other than bounded field/index.
#[no_mangle]
pub extern "C" fn support_read(field:u32,index:u32)->u32{
    LAST.with(|state|{
        let b=state.borrow();
        let Some(r)=b.as_ref() else{return INVALID;};
        match field{
            0=>match r.current{Current::Conflict=>0,Current::Satisfied=>1,Current::Refuted=>2,Current::Ambiguous=>3,Current::Unresolved=>4},
            1=>r.surviving_worlds as u32,
            2=>r.complete as u32,
            3=>r.subsets_evaluated as u32,
            4=>r.subsets_total as u32,
            5=>r.minimum_conflict_size.unwrap_or(INVALID),
            6=>r.all_minimum_conflicts_complete as u32,
            7=>r.conflicts.len() as u32,
            8=>r.satisfied_supports.len() as u32,
            9=>r.refuted_supports.len() as u32,
            10=>r.conflicts.get(index as usize).copied().unwrap_or(INVALID),
            11=>r.satisfied_supports.get(index as usize).copied().unwrap_or(INVALID),
            12=>r.refuted_supports.get(index as usize).copied().unwrap_or(INVALID),
            _=>INVALID,
        }
    })
}

#[cfg(test)]
mod abi_tests{
    use super::*;
    #[test]
    fn abi_packed_masks_and_failure_clear(){
        assert_eq!(support_analyze(3,3,1,6,3|(6<<12)|(5<<24),0,8),0);
        assert_eq!(support_read(0,0),0);
        assert_eq!(support_read(10,0),7);
        assert_eq!(support_read(2,0),1);
        assert_eq!(support_read(10,1),INVALID);
        assert_eq!(support_analyze(3,3,1,6,3|(6<<12)|(5<<24)|(1<<36),0,8),INVALID);
        assert_eq!(support_read(0,0),INVALID);
        assert_eq!(support_analyze(3,1,1,6,8,0,2),INVALID);
        assert_eq!(support_read(2,0),INVALID);
        assert_eq!(support_analyze(3,0,1,1,0,0,1),INVALID);
        assert_eq!(support_analyze(3,5,1,6,7|(7<<12)|(7<<24)|(7<<36),1,32),0);
        assert_eq!(support_read(0,0),1);
        assert_eq!(support_read(11,0),16);
    }
}
