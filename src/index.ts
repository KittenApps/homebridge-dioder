import type { API } from 'homebridge';

import DioderPlatform from './DioderPlatform';
import MatterDioderPlatform from './matter/DioderPlatform';

export default function main(api: API): void {
  if (api.isMatterAvailable() && api.isMatterEnabled()) {
    api.registerPlatform('MatterDioder', MatterDioderPlatform);
  } else {
    api.registerPlatform('Dioder', DioderPlatform);
  }
}
