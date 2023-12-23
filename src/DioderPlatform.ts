import { DioderAccessory } from "./DioderAccessory";
import { RainbowAccessory } from "./RainbowAccessory";
import { GradientAccessory } from "./GradientAccessory";
import type { PlatformAccessory, API, Logging, PlatformConfig, Service, Characteristic, DynamicPlatformPlugin } from "homebridge";

export class DioderPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];
  public animationCancel: Function | undefined = undefined;

  constructor(public readonly log: Logging, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform: Dioder');
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      let removedAccessories = this.accessories;
      // DioderAccessories
      const dioderAccessories = [];
      for (const c of (this.config.leds || [])) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c));
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          removedAccessories = removedAccessories.filter(accessory => accessory.UUID !== uuid);
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
      if (this.config.rainbowAnim?.enabled) {
        let uuid = this.api.hap.uuid.generate("Rainbow Effect");
        let existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          removedAccessories = removedAccessories.filter(accessory => accessory.UUID !== uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          new RainbowAccessory(this, existingAccessory, dioderAccessories);
        } else {
          this.log.info('Adding new accessory: Rainbow Effect');
          const accessory = new this.api.platformAccessory("Rainbow Effect", uuid);
          new RainbowAccessory(this, accessory, dioderAccessories);
          this.api.registerPlatformAccessories('homebridge-dioder', 'Dioder', [accessory]);
        }
      }
      // GradientAccessory
      for (const c of (this.config.gradientAnim || [])) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c));
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          removedAccessories = removedAccessories.filter(accessory => accessory.UUID !== uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          new GradientAccessory(this, existingAccessory, dioderAccessories);
        } else {
          this.log.info('Adding new gradient accessory:', c.name);
          const accessory = new this.api.platformAccessory(c.name, uuid);
          accessory.context.config = c;
          new GradientAccessory(this, accessory, dioderAccessories);
          this.api.registerPlatformAccessories('homebridge-dioder', 'Dioder', [accessory]);
        }
      }
      // removed unused Accessories
      if (removedAccessories.length > 0) {
        this.log.warn('removing unused accessories', removedAccessories.map(a => a.displayName));
        this.api.unregisterPlatformAccessories('homebridge-dioder', 'Dioder', removedAccessories);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  setAnimationCancel(callback: Function): void {
    if (this.animationCancel !== undefined){
      (this.animationCancel as Function)();
    }
    this.animationCancel = callback;
  }

  isAnimationRunning(): boolean {
    return this.animationCancel !== undefined;
  }

  stopAnimation(): void {
    if (this.animationCancel !== undefined){
      (this.animationCancel as Function)();
      this.animationCancel = undefined;
    }
  }
}
