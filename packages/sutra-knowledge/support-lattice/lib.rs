//! Bounded finite-world support lattice. No dependencies, network or floating point.
//! Inputs are compatibility masks from a separately verified observation profile;
//! they are NOT evidence receipts or claims of factual truth.
#![forbid(unsafe_code)]
pub const MAX_OBSERVATIONS: usize = 16;
pub const MAX_WORLDS: usize = 64;
pub const MAX_SUBSETS: usize = 1 << MAX_OBSERVATIONS;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision { Satisfied, Refuted, Unresolved }
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Current { Conflict, Satisfied, Refuted, Ambiguous, Unresolved }
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error { WorldCount, ObservationCount, MaskOutsideWorlds, Budget }
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Analysis {
    pub current: Current,
    pub surviving_worlds: u64,
    /// Inclusion-minimal inconsistent observation subsets.
    pub conflicts: Vec<u32>,
    /// Inclusion-minimal nonempty-survivor conditional supports.
    /// Empty observation mask is a valid support for an invariant decision.
    pub satisfied_supports: Vec<u32>,
    pub refuted_supports: Vec<u32>,
    pub minimum_conflict_size: Option<u32>,
    pub all_minimum_conflicts_complete: bool,
    pub complete: bool,
    pub subsets_evaluated: usize,
    pub subsets_total: usize,
}

fn universe(n: usize) -> u64 {
    if n == 64 { u64::MAX } else { (1u64 << n) - 1 }
}
fn classify(mask: u64, satisfied: u64, refuted: u64) -> Current {
    if mask == 0 { Current::Conflict }
    else if mask & !satisfied == 0 { Current::Satisfied }
    else if mask & !refuted == 0 { Current::Refuted }
    else if mask & !(satisfied | refuted) != 0 { Current::Unresolved }
    else { Current::Ambiguous }
}
fn intersect(mut mask: u64, mut observations: u32, compatibility: &[u64]) -> u64 {
    while observations != 0 && mask != 0 {
        let i = observations.trailing_zeros() as usize;
        mask &= compatibility[i];
        observations &= observations - 1;
    }
    mask
}
// Propagate property existence from immediate proper subsets. This avoids
// scanning an exponentially large antichain for each candidate.
fn inherited_flags(subset: u32, closure: &[u8]) -> u8 {
    let mut bits = subset;
    let mut flags = 0;
    while bits != 0 {
        let bit = bits & bits.wrapping_neg();
        flags |= closure[(subset ^ bit) as usize];
        bits ^= bit;
    }
    flags
}
/// Analyze every subset in cardinality-first order, deterministic numeric mask
/// order within equal cardinality. Budget is a number of subset evaluations.
/// A partial result contains only certified inclusion-minimal sets; it must not
/// be interpreted as an exhaustive family. The full current state is computed
/// independently of the enumeration budget.
pub fn analyze(decisions: &[Decision], compatibility: &[u64], budget: usize) -> Result<Analysis, Error> {
    if decisions.is_empty() || decisions.len() > MAX_WORLDS { return Err(Error::WorldCount); }
    if compatibility.len() > MAX_OBSERVATIONS { return Err(Error::ObservationCount); }
    if budget > MAX_SUBSETS { return Err(Error::Budget); }
    let all = universe(decisions.len());
    if compatibility.iter().any(|m| m & !all != 0) { return Err(Error::MaskOutsideWorlds); }
    let (mut sat, mut no) = (0u64, 0u64);
    for (i,d) in decisions.iter().enumerate() {
        match d { Decision::Satisfied => sat |= 1u64 << i,
                  Decision::Refuted => no |= 1u64 << i,
                  Decision::Unresolved => () }
    }
    let total = 1usize << compatibility.len();
    let current_worlds = intersect(all, (total-1) as u32, compatibility);
    let mut result = Analysis {
        current: classify(current_worlds,sat,no), surviving_worlds: current_worlds,
        conflicts: Vec::new(), satisfied_supports: Vec::new(), refuted_supports: Vec::new(),
        minimum_conflict_size: None, all_minimum_conflicts_complete: false,
        complete: false, subsets_evaluated: 0, subsets_total: total,
    };
    let mut closure = vec![0u8; total];
    'sizes: for size in 0..=compatibility.len() as u32 {
        for subset in 0..total as u32 {
            if subset.count_ones() != size { continue; }
            if result.subsets_evaluated >= budget { break 'sizes; }
            result.subsets_evaluated += 1;
            let m=intersect(all,subset,compatibility);
            let inherited = inherited_flags(subset, &closure);
            let flag = match classify(m,sat,no) {
                Current::Conflict => {
                    if result.minimum_conflict_size.is_none() { result.minimum_conflict_size=Some(size); }
                    if inherited & 1 == 0 { result.conflicts.push(subset); }
                    1
                },
                Current::Satisfied => {
                    if inherited & 2 == 0 { result.satisfied_supports.push(subset); }
                    2
                },
                Current::Refuted => {
                    if inherited & 4 == 0 { result.refuted_supports.push(subset); }
                    4
                },
                _ => 0,
            };
            closure[subset as usize] = inherited | flag;
        }
        if result.minimum_conflict_size == Some(size) { result.all_minimum_conflicts_complete=true; }
    }
    result.complete=result.subsets_evaluated==total;
    if result.complete && result.minimum_conflict_size.is_none() { result.all_minimum_conflicts_complete=true; }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use Decision::*;
    #[test]
    fn pair_triple_and_alternative_minimum_conflicts() {
        let d=[Satisfied,Refuted,Refuted];
        let r=analyze(&d,&[0b011,0b110,0b101,0b001],MAX_SUBSETS).unwrap();
        assert_eq!(r.current,Current::Conflict);
        assert_eq!(r.conflicts,vec![0b1010,0b0111]);
        assert_eq!(r.minimum_conflict_size,Some(2));
        assert!(r.complete&&r.all_minimum_conflicts_complete);
        let ties=analyze(&d,&[1,2,4],MAX_SUBSETS).unwrap();
        assert_eq!(ties.conflicts,vec![3,5,6]);
        assert_eq!(analyze(&d,&[3,6,5],MAX_SUBSETS).unwrap().conflicts,vec![7]);
    }
    #[test]
    fn alternative_support_survives_withdrawal_and_no_vacuous_truth() {
        let d=[Satisfied,Refuted,Refuted];
        let r=analyze(&d,&[3,5,1],MAX_SUBSETS).unwrap();
        assert_eq!(r.current,Current::Satisfied);
        assert_eq!(r.satisfied_supports,vec![4,3]);
        let withdrawn=analyze(&d,&[3,5],MAX_SUBSETS).unwrap();
        assert_eq!(withdrawn.satisfied_supports,vec![3]);
        assert_eq!(withdrawn.current,Current::Satisfied);
        assert_eq!(analyze(&d,&[3],MAX_SUBSETS).unwrap().current,Current::Ambiguous);
        let c=analyze(&d,&[0],MAX_SUBSETS).unwrap();
        assert_eq!(c.current,Current::Conflict);
        assert!(c.satisfied_supports.is_empty()&&c.refuted_supports.is_empty());
    }
    #[test]
    fn unresolved_and_invariant_worlds() {
        let d=[Satisfied,Unresolved];
        let r=analyze(&d,&[1,2],MAX_SUBSETS).unwrap();
        assert_eq!(r.satisfied_supports,vec![1]);
        assert!(r.refuted_supports.is_empty());
        assert_eq!(analyze(&d,&[2],MAX_SUBSETS).unwrap().current,Current::Unresolved);
        let r=analyze(&[Satisfied,Satisfied],&[1,2],MAX_SUBSETS).unwrap();
        assert_eq!(r.satisfied_supports,vec![0]);
        assert_eq!(r.current,Current::Conflict);
    }
    #[test]
    fn budget_and_bounds() {
        let d=[Satisfied,Refuted,Refuted];
        let r=analyze(&d,&[1,2,4],5).unwrap();
        assert_eq!(r.current,Current::Conflict);
        assert_eq!(r.subsets_evaluated,5);
        assert_eq!(r.minimum_conflict_size,Some(2));
        assert!(!r.complete&&!r.all_minimum_conflicts_complete);
        let r=analyze(&d,&[1,2,4],7).unwrap();
        assert!(!r.complete&&r.all_minimum_conflicts_complete);
        assert_eq!(r.conflicts,vec![3,5,6]);
        let r=analyze(&d,&[1,2,4],0).unwrap();
        assert_eq!(r.current,Current::Conflict);
        assert!(r.conflicts.is_empty()&&!r.complete);
        assert_eq!(analyze(&[],&[],0),Err(Error::WorldCount));
        assert_eq!(analyze(&d,&[8],1),Err(Error::MaskOutsideWorlds));
        assert_eq!(analyze(&d,&[0;17],1),Err(Error::ObservationCount));
        assert_eq!(analyze(&d,&[],MAX_SUBSETS+1),Err(Error::Budget));
        let r=analyze(&[Satisfied;64],&[1u64<<63],2).unwrap();
        assert_eq!(r.surviving_worlds,1u64<<63);
        assert_eq!(r.satisfied_supports,vec![0]);
    }
    // Independent direct-set oracle: enumerate world indices and all proper
    // subsets, rather than using bit intersection or family pruning.
    fn oracle(d:&[Decision],rows:&[u64],subset:u32)->Current {
        let w:Vec<_>=d.iter().enumerate().filter(|(i,_)|
            rows.iter().enumerate().all(|(j,row)|subset&(1<<j)==0||row&(1<<i)!=0))
            .map(|(_,v)|*v).collect();
        if w.is_empty(){Current::Conflict}
        else if w.iter().all(|v|*v==Satisfied){Current::Satisfied}
        else if w.iter().all(|v|*v==Refuted){Current::Refuted}
        else if w.contains(&Unresolved){Current::Unresolved}
        else{Current::Ambiguous}
    }
    #[test]
    fn exhaustive_three_world_three_observation_tables() {
        // 8^3 compatibility tables * 3^3 decision assignments = 13,824 cases.
        let labels=[Satisfied,Refuted,Unresolved];
        for a in 0..8 {for b in 0..8 {for c in 0..8 {
            let rows=[a,b,c];
            for i in 0..27 {
                let d=[labels[i%3],labels[(i/3)%3],labels[(i/9)%3]];
                let r=analyze(&d,&rows,8).unwrap();
                let expected=|kind|{
                    let mut sets:Vec<u32>=(0..8).filter(|&s|
                        oracle(&d,&rows,s)==kind && !(0..s).any(|p|p&s==p&&oracle(&d,&rows,p)==kind)).collect();
                    sets.sort_by_key(|s|(s.count_ones(),*s));sets
                };
                assert_eq!(r.current,oracle(&d,&rows,7));
                assert_eq!(r.conflicts,expected(Current::Conflict));
                assert_eq!(r.satisfied_supports,expected(Current::Satisfied));
                assert_eq!(r.refuted_supports,expected(Current::Refuted));
                assert!(r.complete);
            }
        }}}
    }
}
