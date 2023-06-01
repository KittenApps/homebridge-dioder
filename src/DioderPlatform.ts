import { DioderAccessory, LedConfig } from "./DioderAccessory";
import type { AccessoryPlugin, API, Logging, PlatformConfig, StaticPlatformPlugin } from "homebridge";

export class DioderPlatform implements StaticPlatformPlugin {
  private readonly dioderAccessories: DioderAccessory[];

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.dioderAccessories = config.leds.map((c: LedConfig) => new DioderAccessory(log, c, api.hap));
    log.info("Dioder Platform finished initializing!");
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.dioderAccessories);
  }
}
