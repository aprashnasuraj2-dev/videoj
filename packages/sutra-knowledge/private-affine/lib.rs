use bp::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek::{ristretto::{CompressedRistretto, RistrettoPoint}, scalar::Scalar};
use merlin::Transcript;
use rand_core::OsRng;
use zeroize::Zeroize;

const BITS: usize = 32;
pub const MAX_INPUTS: usize = 8;
const MAX_BATCH: usize = 16;
#[cfg(target_arch = "wasm32")]
const MAX_IO: usize = 4096;
const MAX_TERM: u64 = 1 << 28;
const SHIFT: i128 = 1 << 31;

fn scalar(n: i64) -> Scalar {
    let magnitude = Scalar::from(n.unsigned_abs());
    if n < 0 { -magnitude } else { magnitude }
}
struct Statement {
    context: [u8; 32],
    offset: i64,
    terms: Vec<i64>,
}
fn signed(bytes: &[u8]) -> Option<i64> {
    Some(i64::from_le_bytes(bytes.try_into().ok()?))
}

fn parse_statement(input: &[u8]) -> Option<(Statement, &[u8])> {
    let context = input.get(..32)?.try_into().ok()?;
    let n = *input.get(32)? as usize;
    if !(1..=MAX_INPUTS).contains(&n) { return None; }
    let offset = signed(input.get(33..41)?)?;
    let mut bound = offset.unsigned_abs();
    let mut terms = Vec::with_capacity(n);
    for i in 0..n {
        let term = signed(input.get(41+8*i..49+8*i)?)?;
        if term == 0 || term.unsigned_abs() > MAX_TERM { return None; }
        bound = bound.checked_add(term.unsigned_abs().checked_mul(SHIFT as u64)?)?;
        terms.push(term);
    }
    if bound >= 1u64 << 62 { return None; }
    Some((Statement {context, offset, terms}, input.get(41+8*n..)?))
}

fn transcript(statement: &Statement) -> Transcript {
    let mut t = Transcript::new(b"SUTRA private affine range proof v1");
    t.append_message(b"context", &statement.context);
    t.append_message(b"offset", &statement.offset.to_le_bytes());
    for weight in &statement.terms { t.append_message(b"coefficient", &weight.to_le_bytes()); }
    t
}

fn prove(input: &[u8]) -> Option<Vec<u8>> {
    let (statement, tail) = parse_statement(input)?;
    let n = statement.terms.len();
    if tail.len() != n*8 { return None; }
    let m = (n+1).next_power_of_two();
    let mut values = Vec::with_capacity(m);
    let mut blindings = Vec::with_capacity(m);
    let mut difference = i128::from(statement.offset);
    let mut difference_blinding = Scalar::ZERO;
    let mut rng = OsRng;
    for (bytes, weight) in tail.chunks_exact(8).zip(&statement.terms) {
        let value = signed(bytes)?;
        if !(-SHIFT..SHIFT).contains(&i128::from(value)) { return None; }
        let blinding = Scalar::random(&mut rng);
        difference += i128::from(value)*i128::from(*weight);
        difference_blinding += scalar(*weight)*blinding;
        values.push((i128::from(value)+SHIFT) as u64);
        blindings.push(blinding);
    }
    if !(0..(1i128 << BITS)).contains(&difference) {
        values.zeroize();blindings.zeroize();difference_blinding.zeroize();
        return None;
    }
    values.push(difference as u64);
    blindings.push(difference_blinding);
    values.resize(m,0);
    blindings.resize(m,Scalar::ZERO);
    let pc = PedersenGens::default();
    let bp = BulletproofGens::new(BITS,MAX_BATCH);
    let result = RangeProof::prove_multiple_with_rng(&bp,&pc,&mut transcript(&statement),&values,&blindings,BITS,&mut rng);
    values.zeroize();blindings.zeroize();difference_blinding.zeroize();
    let (proof, commitments) = result.ok()?;
    let mut wire = Vec::new();
    for point in commitments.iter().take(n) { wire.extend_from_slice(point.as_bytes()); }
    wire.extend_from_slice(&proof.to_bytes());
    Some(wire)
}

fn verify(input: &[u8]) -> bool {
    let Some((statement, tail)) = parse_statement(input) else { return false; };
    let n = statement.terms.len();
    let m = (n+1).next_power_of_two();
    if tail.len() <= n*32 || tail.len() > 2048 { return false; }
    let pc = PedersenGens::default();
    let bp = BulletproofGens::new(BITS,MAX_BATCH);
    let offset = i128::from(statement.offset)-SHIFT*statement.terms.iter().copied().map(i128::from).sum::<i128>();
    let Ok(offset) = i64::try_from(offset) else { return false; };
    let mut difference = pc.B*scalar(offset);
    let mut commitments = Vec::with_capacity(m);
    for (bytes, coefficient) in tail[..n*32].chunks_exact(32).zip(&statement.terms) {
        let Ok(bytes) = bytes.try_into() else { return false; };
        let compressed = CompressedRistretto(bytes);
        let Some(point) = compressed.decompress() else { return false; };
        difference += point*scalar(*coefficient);
        commitments.push(compressed);
    }
    commitments.push(difference.compress());
    commitments.resize(m,RistrettoPoint::default().compress());
    let Ok(proof) = RangeProof::from_bytes(&tail[n*32..]) else { return false; };
    proof.verify_multiple(&bp,&pc,&mut transcript(&statement),&commitments,BITS).is_ok()
}

#[cfg(target_arch = "wasm32")]
mod browser {
    use super::*;
    use std::cell::RefCell;

    #[link(wasm_import_module = "sutra_entropy")]
    extern "C" { fn fill_random(pointer: *mut u8, length: usize); }
    fn entropy(out: &mut [u8]) -> Result<(), getrandom::Error> {
        // The browser host supplies crypto.getRandomValues. Missing entropy
        // aborts the operation instead of selecting a deterministic fallback.
        unsafe { fill_random(out.as_mut_ptr(),out.len()); }
        Ok(())
    }
    getrandom::register_custom_getrandom!(entropy);

    thread_local! {
        static INPUT: RefCell<[u8; MAX_IO]> = const { RefCell::new([0; MAX_IO]) };
        static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    }
    #[no_mangle]
    pub extern "C" fn private_input_pointer() -> *mut u8 { INPUT.with(|input| input.borrow_mut().as_mut_ptr()) }
    #[no_mangle]
    pub extern "C" fn private_output_pointer() -> *const u8 { OUTPUT.with(|output| output.borrow().as_ptr()) }
    #[no_mangle]
    pub extern "C" fn private_run(mode:u32,len:usize)->u32 {
        INPUT.with(|input|OUTPUT.with(|output|{
            let mut input=input.borrow_mut();
            let mut output=output.borrow_mut();
            output.clear();
            let observed=if len>MAX_IO {0} else if mode==1 {
                match prove(&input[..len]) {Some(value)=>{*output=value;output.len() as u32},None=>0}
            } else if mode==2 {u32::from(verify(&input[..len]))} else {0};
            input.zeroize();
            observed
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn header(offset:i64,terms:&[i64])->Vec<u8>{
        let mut data=vec![7;32];data.push(terms.len() as u8);data.extend(offset.to_le_bytes());
        for term in terms{data.extend(term.to_le_bytes());}data
    }
    #[test]
    fn hidden_comparison_rejects_wrong_domain_and_forged_context() {
        let h=header(-1,&[1,-1]);
        let mut witnessed=h.clone();witnessed.extend(120i64.to_le_bytes());witnessed.extend(100i64.to_le_bytes());
        let proof=prove(&witnessed).unwrap();
        let verification=[h.clone(),proof.clone()].concat();
        assert!(verify(&verification));
        let mut corrupt=verification.clone();corrupt[0]^=1;assert!(!verify(&corrupt));
        let mut forged=verification;*forged.last_mut().unwrap()^=1;assert!(!verify(&forged));
        let wrong=[h.clone(),100i64.to_le_bytes().to_vec(),120i64.to_le_bytes().to_vec()].concat();
        assert!(prove(&wrong).is_none());
        let overflow=[h,(1i64<<31).to_le_bytes().to_vec(),0i64.to_le_bytes().to_vec()].concat();
        assert!(prove(&overflow).is_none());
    }
}
