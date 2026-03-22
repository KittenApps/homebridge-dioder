import type { API } from 'homebridge';

import DioderPlatform from './DioderPlatform';

export default function main(api: API): void {
  api.registerPlatform('Dioder', DioderPlatform);
}
