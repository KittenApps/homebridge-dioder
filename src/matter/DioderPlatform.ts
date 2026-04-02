import type { MatterAccessory, API, Logging, PlatformConfig, DynamicPlatformPlugin } from 'homebridge';
import lg from 'lgpio';

import DioderAccessory from './DioderAccessory';

declare global {
  var DEV: boolean;
}

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

const PLUGIN_NAME = '@silizia/homebridge-dioder';

export default class DioderPlatform implements DynamicPlatformPlugin {
  public readonly accessories: Map<string, MatterAccessory> = new Map();
  public readonly outdatedAccessories: MatterAccessory<Record<string, never>>[] = [];
  private gpiochip?: number;

  constructor(
    public readonly log: Logging,
    public readonly config: DioderConfig,
    public readonly api: API
  ) {
    this.log.debug('Finished initializing platform: Dioder');
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      const removedAccessories = new Map(this.accessories);
      const newAccessories: MatterAccessory[] = [];
      // DioderAccessories
      this.gpiochip = DEV ? 0 : lg.gpiochipOpen(0);
      for (const c of this.config.leds || []) {
        const uuid = this.api.hap.uuid.generate(JSON.stringify(c.name));
        const existingAccessory = this.accessories.get(uuid) as MatterAccessory<Record<string, never>>;
        if (existingAccessory) {
          removedAccessories.delete(uuid);
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          // oxlint-disable-next-line no-new
          new DioderAccessory(this.api, this.log, this.gpiochip, c, existingAccessory);
        } else {
          this.log.info('Adding new accessory:', c.name);
          const device = new DioderAccessory(this.api, this.log, this.gpiochip, c);
          newAccessories.push(device.getAccessory());
        }
      }
      // removed unused Accessories
      if (removedAccessories.size > 0) {
        const ra = Array.from(removedAccessories).map(([_k, v]) => v);
        this.log.warn(
          'removing unused accessories',
          ra.map(a => `${a.displayName} (${a.UUID})`)
        );
        this.api.matter.unregisterPlatformAccessories(PLUGIN_NAME, 'Dioder', ra);
      }
      if (newAccessories.length > 0) {
        this.log.info(
          'added new accessories',
          newAccessories.map(a => `${a.displayName} (${a.UUID})`)
        );
        this.api.matter.registerPlatformAccessories(PLUGIN_NAME, 'Dioder', newAccessories);
      }
    });
    this.api.on('shutdown', () => {
      if (!DEV && this.gpiochip !== undefined) {
        lg.gpiochipClose(this.gpiochip);
      }
    });
  }

  // oxlint-disable-next-line no-empty-function, class-methods-use-this
  configureAccessory(): void {}

  configureMatterAccessory(accessory: MatterAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName, accessory.UUID);
    this.accessories.set(accessory.UUID, accessory);
  }
}
