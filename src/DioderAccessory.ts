import { colord, type HsvColor } from 'colord';
import type { CharacteristicValue, PlatformAccessory, Service, Logging } from 'homebridge';
import lg from 'lgpio';

import type DioderPlatform from './DioderPlatform';
import type { DioderContext, LedConfig } from './DioderPlatform';

const MIN_PWM = 0.5; // min pwm to get actually light from dioder, depends on PWM_RANGE
const PWM_FREQUENCY = 10000;
const GAMMA_COR = 2.8;

export default class DioderAccessory {
  private hsv: HsvColor;
  private on: boolean;

  private readonly LEDservice: Service;
  private readonly Characteristic;
  private readonly log: Logging;
  private readonly config: LedConfig;

  constructor(
    private readonly platform: DioderPlatform,
    private readonly accessory: PlatformAccessory<DioderContext>,
    private readonly gpiochip: number
  ) {
    const { hap } = platform.api;
    this.Characteristic = hap.Characteristic;
    this.log = platform.log;

    this.config = accessory.context.config;
    lg.gpioClaimOutput(gpiochip, this.config.rPin);
    lg.gpioClaimOutput(gpiochip, this.config.gPin);
    lg.gpioClaimOutput(gpiochip, this.config.bPin);
    this.hsv = { h: 0, s: 0, v: 0 };
    this.on = false;

    this.accessory
      .getService(hap.Service.AccessoryInformation)
      ?.setCharacteristic(this.Characteristic.Manufacturer, 'Silizia')
      .setCharacteristic(this.Characteristic.Model, 'Fancy LED')
      .setCharacteristic(this.Characteristic.SerialNumber, '42');

    this.accessory.on('identify', () => this.identify());

    this.LEDservice = this.accessory.getService(hap.Service.Lightbulb) || this.accessory.addService(hap.Service.Lightbulb);
    this.LEDservice.setCharacteristic(this.Characteristic.Name, this.config.name);

    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).onGet(this.getHue.bind(this)).onSet(this.setHue.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).onGet(this.getSaturation.bind(this)).onSet(this.setSaturation.bind(this));
  }

  identify(): void {
    this.pwm(0, 0, 0);
    setTimeout(() => {
      this.pwm(1, 0, 0);
      setTimeout(() => {
        this.pwm(0, 0, 0);
        if (this.getBrightness() > 0) {
          setTimeout(() => {
            this.setHSV(this.hsv);
          }, 1000);
        }
      }, 3000);
    }, 1000);
    this.log.info('Identify!');
  }

  pwm(r: number, g: number, b: number): void {
    lg.txPwm(this.gpiochip, this.config.rPin, PWM_FREQUENCY, r, 0, 0);
    lg.txPwm(this.gpiochip, this.config.gPin, PWM_FREQUENCY, g, 0, 0);
    lg.txPwm(this.gpiochip, this.config.bPin, PWM_FREQUENCY, b, 0, 0);
  }

  setOn(on: CharacteristicValue): void {
    this.log.info('setOn', on);
    this.on = on as boolean;
    if (on) {
      this.platform.stopAnimation();
      if (this.getBrightness() === 0) {
        this.hsv.v = 100;
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      } else {
        this.setHSV(this.hsv);
      }
    } else {
      this.pwm(0, 0, 0);
      this.hsv = { h: 0, s: 0, v: 0 };
    }
  }

  getOn(): boolean {
    if (this.platform.isAnimationRunning()) return false;
    return this.getBrightness() > 0;
  }

  setBrightness(v: CharacteristicValue): void {
    this.log.info('setBrightness', v);
    this.hsv.v = v as number;
    this.setHSV(this.hsv);
  }

  getBrightness(): number {
    return this.hsv.v;
  }

  setHue(h: CharacteristicValue): void {
    this.log.info('setHue', h);
    this.hsv.h = h as number;
    this.setHSV(this.hsv);
  }

  getHue(): number {
    return this.hsv.h;
  }

  setSaturation(s: CharacteristicValue): void {
    this.log.info('setSaturation', s);
    this.hsv.s = s as number;
    this.setHSV(this.hsv);
  }

  getSaturation(): number {
    return this.hsv.s;
  }

  setHSV(c: HsvColor, t?: boolean): void {
    if (t || (this.on && this.getBrightness() > 0)) {
      const { r, g, b } = colord(c).toRgb();
      this.pwm(
        (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM,
        (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM,
        (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM
      );
      this.hsv = c;
      if (!t) this.log.info(`set ${this.accessory.displayName} RGB to ${r}, ${g}, ${b}`);
    } else {
      this.log.warn('Skipping color change while light bulb being off');
    }
  }

  getHSV(): HsvColor {
    return this.hsv;
  }

  setRGB(r: number, g: number, b: number): void {
    this.pwm(
      (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM,
      (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM,
      (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM
    );
    this.hsv = colord({ r, g, b }).toHsv();
  }

  turnOff(): void {
    this.pwm(0, 0, 0);
    this.hsv = { h: 0, s: 0, v: 0 };
  }
}
