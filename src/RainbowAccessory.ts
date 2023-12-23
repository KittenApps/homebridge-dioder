import type { PlatformAccessory } from 'homebridge';
import type { DioderAccessory } from './DioderAccessory';
import type { DioderPlatform } from './DioderPlatform';
import { AnimatedAccessory } from './AnimatedAccessory';

const SATURATION = 100;

export class RainbowAccessory extends AnimatedAccessory {
  private currentHue: number;

  constructor(platform: DioderPlatform, accessory: PlatformAccessory, leds: DioderAccessory[]) {
    super(platform, accessory, leds, 'Rainbow Effect');
    this.currentHue = 0;
  }

  runAnimation(): void {
    //this.log.warn(`currentHue: ${this.currentHue}, offset: ${this.offset}, speed: ${this.speed}`);
    for (let i = 0; i < this.leds.length; i++){
      this.leds[i].setHSV({
        h: (this.currentHue + i * this.offset) % 360,
        s: SATURATION,
        v: this.brightness
      }, true);
    }
    this.currentHue = (this.currentHue + this.speed) % 360;
  }
}
