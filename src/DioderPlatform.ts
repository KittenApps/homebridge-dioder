import { DioderAccessory, LedConfig } from "./DioderAccessory";
import { RainbowAccessory } from "./RainbowAccessory";
import type { AccessoryPlugin, API, Logging, PlatformConfig, StaticPlatformPlugin } from "homebridge";

export class DioderPlatform implements StaticPlatformPlugin {
  private readonly accessPlugin: AccessoryPlugin[];

  constructor(log: Logging, config: PlatformConfig, api: API) {
    const dioderAccessories: DioderAccessory[] = config.leds.map((c: LedConfig) => new DioderAccessory(log, c, api.hap));
    this.accessPlugin = [...(dioderAccessories as AccessoryPlugin[]), new RainbowAccessory(log, dioderAccessories, api.hap)];
    log.info("Dioder Platform finished initializing!");
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.accessPlugin);
  }
}
