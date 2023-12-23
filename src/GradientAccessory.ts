import type { PlatformAccessory } from 'homebridge';
import type { DioderAccessory } from './DioderAccessory';
import type { DioderPlatform } from './DioderPlatform';
import { AnimatedAccessory } from './AnimatedAccessory';
import { colord, RgbColor } from 'colord';


export class GradientAccessory extends AnimatedAccessory {
  private currentStep: number;
  private colors: RgbColor[];

  constructor(platform: DioderPlatform, accessory: PlatformAccessory, leds: DioderAccessory[]) {
    super(platform, accessory, leds, accessory.context.config.name);
    this.currentStep = 0;
    this.colors = accessory.context.config.colors.map((c: string) => colord(c).toRgb());
  }

  runAnimation(): void {
    const len = this.leds.length;
    for (let i = 0; i < len; i++){
      const step = this.currentStep + i * this.offset / 50;
      const prevColor = Math.floor(step) % len;
      const nextColor = (prevColor + 1) % len;
      const prog = step % 1;
      const r = this.colors[prevColor].r * (1 - prog) + this.colors[nextColor].r * prog;
      const g = this.colors[prevColor].g * (1 - prog) + this.colors[nextColor].g * prog;
      const b = this.colors[prevColor].b * (1 - prog) + this.colors[nextColor].b * prog;
      this.leds[i].setRGB(r, g, b);
    }
    this.currentStep = (this.currentStep + this.speed * len / 360) % len;
  }
}
