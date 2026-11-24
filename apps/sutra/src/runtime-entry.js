export {
 RuntimeError,
 compileNetwork,
 executionLimits,
 loadLocalNetwork,
 loadPeerNetwork,
 resolveSymbolicPeerLinks,
 runNetwork
} from '../../../packages/sutra-runtime/index.js';
export {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
export {createConsentInspector} from '../../../packages/sutra-consent/index.js';

export const sutraRuntimeProfile=Object.freeze({
 name:'sutra-restricted-browser-runtime',
 version:'0.1.0',
 execution:'browser',
 networkFormat:'resolved-neuro-san-json',
 defaultInference:'publisher-funded-optional-until-release',
 byok:false,
 truthGuarantee:'none'
});
