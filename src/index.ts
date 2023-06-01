import { DioderPlatform } from './DioderPlatform';

import type { API } from 'homebridge';

export default (api: API) => {
  api.registerPlatform("Dioder", DioderPlatform);
};