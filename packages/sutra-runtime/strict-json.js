// Keep the existing runtime import path stable. The standalone consent kit
// owns the dependency-free wire scanner so its JSON loader needs no sibling package.
export {parseUniqueJson} from '../sutra-consent/strict-json.js';
