import { DioderAccessory } from "./DioderAccessory";
import { RainbowAccessory } from "./RainbowAccessory";
import type { PlatformAccessory, API, Logging, PlatformConfig, Service, Characteristic, DynamicPlatformPlugin } from "homebridge";

export class DioderPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];
  public animationCancel: Function | undefined = undefined;

  constructor(public readonly log: Logging, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform: Dioder');
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      // DioderAccessories
      const dioderAccessories = [];
      for (const c of this.config.leds) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c));
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          dioderAccessories.push(new DioderAccessory(this, existingAccessory));
        } else {
          this.log.info('Adding new accessory:', c.name);
          const accessory = new this.api.platformAccessory(c.name, uuid);
          accessory.context.config = c;
          dioderAccessories.push(new DioderAccessory(this, accessory));
          this.api.registerPlatformAccessories('homebridge-dioder', 'Dioder', [accessory]);
        }
      }
      // RainbowAccessory
      const uuid = this.api.hap.uuid.generate("Rainbow Effect");
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new RainbowAccessory(this, existingAccessory, dioderAccessories);
      } else {
        this.log.info('Adding new accessory: Rainbow Effect');
        const accessory = new this.api.platformAccessory("Rainbow Effect", uuid);
        new RainbowAccessory(this, accessory, dioderAccessories);
        this.api.registerPlatformAccessories('homebridge-dioder', 'Dioder', [accessory]);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  setAnimationCancel(callback: Function): void {
    if (this.setAnimationCancel !== undefined){
      (this.animationCancel as Function)();
    }
    this.animationCancel = callback;
  }

  isAnimationRunning(): boolean {
    return this.setAnimationCancel !== undefined;
  }

  stopAnimation(): void {
    if (this.setAnimationCancel !== undefined){
      (this.animationCancel as Function)();
      this.animationCancel = undefined;
    }
  }
}
