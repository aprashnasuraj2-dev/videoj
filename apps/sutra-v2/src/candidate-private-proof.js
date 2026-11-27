import {parseUniqueJson} from '../../../packages/sutra-consent/strict-json.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {projectCandidateComputation, replayCandidateCone} from '../../../packages/sutra-knowledge/candidate-capsule.js';
import {projectPrivateAffineStatement} from '../../../packages/sutra-knowledge/reviewed-interval.js';

export const PRIVATE_PROOF_VERSION = 'sutra-private-affine-proof/v1';
const PIN = /^sha256:[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const INT = /^(?:0|-?[1-9][0-9]{0,18})$/;
const MAX_WEIGHT = 1n << 28n;
const SHIFT = 1n << 31n;
const parse = text => parseUniqueJson(text, {maxChars: 16384, maxDepth: 8});
const isPin = value => typeof value === 'string' && PIN.test(value);
const keys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const fail = reason => { throw new TypeError('PRIVATE_PROOF_' + reason); };
const abs = number => number < 0n ? -number : number;
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), part => parseInt(part,16));
const integer = value => {
  if (typeof value !== 'string' || !INT.test(value)) fail('INTEGER');
  return BigInt(value);
};

function checkStatement(s) {
  if (!keys(s, ['version','versionPin','candidateId','programPin','operator','outcome','scale','offset','terms']) ||
      s.version !== PRIVATE_PROOF_VERSION || !isPin(s.versionPin) || !isPin(s.programPin) ||
      typeof s.candidateId !== 'string' || !ID.test(s.candidateId) ||
      !['lt','le','gt','ge'].includes(s.operator) ||
      !['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(s.outcome) ||
      !Array.isArray(s.terms) || s.terms.length < 1 || s.terms.length > 8) fail('STATEMENT');
  const offset = integer(s.offset), scale = integer(s.scale);
  if (scale < 1n || scale > MAX_WEIGHT) fail('SCALE');
  let previous = 0, bound = abs(offset);
  const terms = s.terms.map(row => {
    if (!keys(row,['id','weight']) || typeof row.id !== 'string' || !/^n[1-9][0-9]?$/.test(row.id)) fail('TERM');
    const index = Number(row.id.slice(1)), weight = integer(row.weight);
    if (index > 64 || index <= previous || weight === 0n || abs(weight) > MAX_WEIGHT) fail('TERM');
    previous = index;
    bound += abs(weight) * SHIFT;
    return weight;
  });
  if (bound >= (1n << 62n)) fail('BOUND');
  return {offset,terms};
}

async function engineInput(statementText, statement, tail) {
  const {offset,terms} = checkStatement(statement);
  const output = new Uint8Array(41 + 8 * terms.length + tail.length);
  const view = new DataView(output.buffer);
  output.set(unhex((await casePin(statementText)).slice(7)));
  output[32] = terms.length;
  view.setBigInt64(33,offset,true);
  terms.forEach((weight,i) => view.setBigInt64(41 + 8*i,weight,true));
  output.set(tail,41 + 8*terms.length);
  return output;
}
function rational(value) {
  const [n,d] = value.split('/').map(BigInt);
  return [n,d];
}
function transform(operator, outcome) {
  const holds = outcome === 'CONDITIONALLY_SATISFIED';
  if (operator === 'gt') return holds ? [1n,-1n] : [-1n,0n];
  if (operator === 'ge') return holds ? [1n,0n] : [-1n,-1n];
  if (operator === 'lt') return holds ? [-1n,-1n] : [1n,0n];
  if (operator === 'le') return holds ? [-1n,0n] : [1n,-1n];
  fail('OPERATOR');
}

export async function provePrivateCandidate(versionText, versionPin, candidateId, engine) {
  const projection = await projectCandidateComputation(versionText,versionPin,candidateId);
  const {nodes,target,outcome} = projection;
  const form = projectPrivateAffineStatement(nodes,target);
  if (!form) fail('AFFINE_PROFILE');
  const byId = new Map(nodes.map(node => [node.id,node]));
  const values = form.terms.map(row => rational(byId.get(row.id).value));
  const coefficients = form.terms.map(row => rational(row.weight));
  if (values.length < 1 || values.length > 8 || coefficients.some(([,d]) => d !== 1n)) fail('INTEGER_WEIGHTS');
  const offset = rational(form.offset);
  // Every reviewed input is a variable, so the public form cannot contain a
  // value-derived offset or denominator. Requiring zero prevents metadata leaks.
  if (offset[0] !== 0n || offset[1] !== 1n) fail('PRIVATE_OFFSET');
  // A fixed public scale avoids inferring denominators from the proof metadata.
  const scale = 1000n;
  const [direction,strict] = transform(form.operator,outcome);
  const terms = form.terms.map((row,i) => ({id:row.id,weight:String(direction*coefficients[i][0])}));
  const programText = JSON.stringify({nodes:nodes.map(node => {
    if (node.kind !== 'input') return node;
    const {value,...publicNode} = node;
    return publicNode;
  }),target});
  const statement = {
    version:PRIVATE_PROOF_VERSION,versionPin,candidateId,
    programPin:await casePin(programText),
    operator:form.operator,outcome,scale:String(scale),offset:String(strict),terms
  };
  const statementText = JSON.stringify(statement);
  const tail = new Uint8Array(values.length*8), view = new DataView(tail.buffer);
  let input, proof;
  try {
    values.forEach(([n,d],i) => {
      const scaled = n * scale;
      if (scaled % d !== 0n || scaled/d < -SHIFT || scaled/d >= SHIFT) fail('VALUE_GRID');
      view.setBigInt64(i*8,scaled/d,true);
    });
    input = await engineInput(statementText,statement,tail);
    proof = await engine.prove(input);
  } finally {
    tail.fill(0);
    input?.fill(0);
  }
  if (!(proof instanceof Uint8Array) || !proof.length || proof.length > 2048) fail('PROVER_REFUSED');
  const text = JSON.stringify({statementText,programText,proof:hex(proof)});
  if (new TextEncoder().encode(text).length > 16384) fail('PROOF_SIZE');
  return Object.freeze({text,pin:await casePin(text)});
}

export async function verifyPrivateCandidate(text, retainedPin, engine) {
  if (typeof text !== 'string' || text.length > 16384 || new TextEncoder().encode(text).length > 16384 ||
      !isPin(retainedPin) || await casePin(text) !== retainedPin) fail('PIN');
  const wrapper = parse(text);
  if (!keys(wrapper,['statementText','programText','proof']) || typeof wrapper.proof !== 'string' ||
      !/^(?:[0-9a-f]{2}){1,2048}$/.test(wrapper.proof)) fail('WIRE');
  const statement = parse(wrapper.statementText);
  const [direction,strict] = transform(statement?.operator,statement?.outcome);
  checkStatement(statement);
  const program = parse(wrapper.programText);
  if (!keys(program,['nodes','target']) || !Array.isArray(program.nodes) || program.nodes.length < 2 || program.nodes.length > 64 ||
      await casePin(wrapper.programText) !== statement.programPin) fail('PROGRAM');
  const nodes = program.nodes.map(node => {
    if (node?.kind !== 'input') return node;
    if (!keys(node,['id','kind','dimension','basis'])) fail('PROGRAM_INPUT');
    return {...node,value:'0/1'};
  });
  await replayCandidateCone(nodes,program.target);
  const form = projectPrivateAffineStatement(nodes,program.target);
  if (!form || form.operator !== statement.operator || form.offset !== '0/1' ||
      JSON.stringify(form.terms.map(row => {
        const [n,d] = rational(row.weight);
        if (d !== 1n) fail('INTEGER_WEIGHTS');
        return {id:row.id,weight:String(n*direction)};
      })) !== JSON.stringify(statement.terms) ||
      statement.offset !== String(strict) || statement.scale !== '1000') fail('PUBLIC_PROFILE');
  if (!await engine.verify(await engineInput(wrapper.statementText,statement,unhex(wrapper.proof)))) fail('INVALID_PROOF');
  return Object.freeze({
    versionPin:statement.versionPin,candidateId:statement.candidateId,programPin:statement.programPin,
    operator:statement.operator,outcome:statement.outcome,hiddenQuantities:statement.terms.length,
    sourceCorrespondence:'PUBLISHER_DECLARATION',decisionAuthority:'NONE'
  });
}
