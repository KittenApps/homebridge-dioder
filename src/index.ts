import type { API } from 'homebridge';

import { DioderPlatform } from './DioderPlatform';

export default (api: API): void => {
  api.registerPlatform('Dioder', DioderPlatform);
};
