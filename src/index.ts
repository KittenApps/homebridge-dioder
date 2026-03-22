import { DioderPlatform } from './DioderPlatform';

import type { API } from 'homebridge';

export default (api: API): void => {
  api.registerPlatform("Dioder", DioderPlatform);
};