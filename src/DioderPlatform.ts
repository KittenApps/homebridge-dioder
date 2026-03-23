import type { PlatformAccessory, API, Logging, PlatformConfig, DynamicPlatformPlugin } from 'homebridge';
import lg from 'lgpio';

import DioderAccessory from './DioderAccessory';
import GradientAccessory from './GradientAccessory';
import RainbowAccessory from './RainbowAccessory';

export interface LedConfig {
  name: string;
  rPin: number;
  gPin: number;
  bPin: number;
  freq: number;
}

interface GradiantConfig {
  name: string;
  colors: string[];
}

interface DioderConfig extends PlatformConfig {
  leds: LedConfig[];
  gradientAnim: GradiantConfig[];
  rainbowAnim: { enabled: boolean };
}

export interface DioderContext {
  config: LedConfig;
}

export interface GradiantContext {
  config: GradiantConfig;
}

const PLUGIN_NAME = '@silizia/homebridge-dioder';

export default class DioderPlatform implements DynamicPlatformPlugin {
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly outdatedAccessories: PlatformAccessory[] = [];
  public animationCancel?: () => void = undefined;

  constructor(
    public readonly log: Logging,
    public readonly config: DioderConfig,
    public readonly api: API
  ) {
    this.log.debug('Finished initializing platform: Dioder');
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      const removedAccessories = this.accessories;
      // DioderAccessories
      const dioderAccessories: DioderAccessory[] = [];
      const gpiochip = lg.gpiochipOpen(0);
      for (const c of this.config.leds || []) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c));
        const existingAccessory = this.accessories.get(uuid) as PlatformAccessory<DioderContext>;
        if (existingAccessory) {
          removedAccessories.delete(uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          dioderAccessories.push(new DioderAccessory(this, existingAccessory, gpiochip));
        } else {
          this.log.info('Adding new accessory:', c.name);
          const accessory = new this.api.platformAccessory<DioderContext>(c.name, uuid);
          accessory.context.config = c;
          dioderAccessories.push(new DioderAccessory(this, accessory, gpiochip));
          this.api.registerPlatformAccessories(PLUGIN_NAME, 'Dioder', [accessory]);
        }
      }
      // RainbowAccessory
      if (this.config.rainbowAnim?.enabled) {
        const uuid = this.api.hap.uuid.generate('Rainbow Effect');
        const existingAccessory = this.accessories.get(uuid);
        if (existingAccessory) {
          removedAccessories.delete(uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          // oxlint-disable-next-line no-new
          new RainbowAccessory(this, existingAccessory, dioderAccessories);
        } else {
          this.log.info('Adding new accessory: Rainbow Effect');
          const accessory = new this.api.platformAccessory('Rainbow Effect', uuid);
          // oxlint-disable-next-line no-new
          new RainbowAccessory(this, accessory, dioderAccessories);
          this.api.registerPlatformAccessories(PLUGIN_NAME, 'Dioder', [accessory]);
        }
      }
      // GradientAccessory
      for (const c of this.config.gradientAnim || []) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c));
        const existingAccessory = this.accessories.get(uuid) as PlatformAccessory<GradiantContext>;
        if (existingAccessory) {
          removedAccessories.delete(uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          // oxlint-disable-next-line no-new
          new GradientAccessory(this, existingAccessory, dioderAccessories);
        } else {
          this.log.info('Adding new gradient accessory:', c.name);
          const accessory = new this.api.platformAccessory<GradiantContext>(c.name, uuid);
          accessory.context.config = c;
          // oxlint-disable-next-line no-new
          new GradientAccessory(this, accessory, dioderAccessories);
          this.api.registerPlatformAccessories(PLUGIN_NAME, 'Dioder', [accessory]);
        }
      }
      // removed unused Accessories
      if (removedAccessories.size > 0) {
        const ra = Array.from(removedAccessories).map(([_k, v]) => v);
        this.log.warn(
          'removing unused accessories',
          ra.map(a => a.displayName)
        );
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, 'Dioder', ra);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName, accessory.UUID);
    this.accessories.set(accessory.UUID, accessory);
  }

  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  setAnimationCancel(callback: () => void): void {
    if (this.animationCancel !== undefined) {
      (this.animationCancel as () => void)();
    }
    this.animationCancel = callback;
  }

  isAnimationRunning(): boolean {
    return this.animationCancel !== undefined;
  }

  stopAnimation(): void {
    if (this.animationCancel !== undefined) {
      (this.animationCancel as () => void)();
      this.animationCancel = undefined;
    }
  }
}
