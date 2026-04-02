import type { API } from 'homebridge';

import DioderPlatform from './DioderPlatform';

interface DioderAPI extends API {
  loadMatterAPI(): Promise<void>;
}

export default async function main(api: DioderAPI): Promise<void> {
  await api.loadMatterAPI();
  api.registerPlatform('Dioder', DioderPlatform);
}
