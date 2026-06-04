import { GrabFunction } from './common/types';
import { log } from '../log-json/log-json.ts';
declare const grab: GrabFunction;
export { grab };
export default grab;
export { log };
export * from './common/types';
export * from './devtools/devtools';
export * from './common/utils';
