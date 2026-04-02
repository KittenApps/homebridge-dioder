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
    if (!DEV) {
      lg.gpioClaimOutput(gpiochip, this.config.rPin);
      lg.gpioClaimOutput(gpiochip, this.config.gPin);
      lg.gpioClaimOutput(gpiochip, this.config.bPin);
    }
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
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).onSet(this.setHue.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).onSet(this.setSaturation.bind(this));
  }

  identify(): void {
    this.pwm(0, 0, 0);
    setTimeout(() => {
      this.pwm(255, 0, 0);
      setTimeout(() => {
        this.pwm(0, 0, 0);
        if (this.hsv.v > 0) {
          setTimeout(() => {
            this.setHSV(this.hsv);
          }, 1000);
        }
      }, 3000);
    }, 1000);
    this.log.info('Identify!');
  }

  pwm(r: number, g: number, b: number): void {
    if (DEV) {
      this.log.info(`pwm r: ${r}, g: ${g}, b: ${b} for gpiochip: ${this.gpiochip} with freq: ${this.config.freq ?? PWM_FREQUENCY}`);
      this.log.info(`rpin ${this.config.rPin} to ${r === 0 ? 'off' : (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
      this.log.info(`gpin ${this.config.gPin} to ${g === 0 ? 'off' : (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
      this.log.info(`bpin ${this.config.bPin} to ${b === 0 ? 'off' : (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
    } else {
      lg.txPwm(this.gpiochip, this.config.rPin, r === 0 ? 0 : (this.config.freq ?? PWM_FREQUENCY), (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, 0);
      lg.txPwm(this.gpiochip, this.config.gPin, g === 0 ? 0 : (this.config.freq ?? PWM_FREQUENCY), (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, 0);
      lg.txPwm(this.gpiochip, this.config.bPin, b === 0 ? 0 : (this.config.freq ?? PWM_FREQUENCY), (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, 0);
    }
  }

  setOn(on: CharacteristicValue): void {
    this.log.info('setOn', on);
    this.on = on as boolean;
    if (on) {
      this.platform.stopAnimation();
      if (this.hsv.v === 0) {
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
    return this.hsv.v > 0;
  }

  setBrightness(v: CharacteristicValue): void {
    this.log.info('setBrightness', v);
    this.hsv.v = v as number;
    this.setHSV(this.hsv);
  }

  setHue(h: CharacteristicValue): void {
    this.log.info('setHue', h);
    this.hsv.h = h as number;
    this.setHSV(this.hsv);
  }

  setSaturation(s: CharacteristicValue): void {
    this.hsv.s = s as number;
    this.log.info('setSaturation', s, this.hsv.s);
    this.setHSV(this.hsv);
  }

  setHSV(c: HsvColor, t?: boolean): void {
    if (t || (this.on && this.hsv.v > 0)) {
      const { r, g, b } = colord(c).toRgb();
      this.pwm(r, g, b);
      if (!t) this.log.info(`set ${this.accessory.displayName} r: ${r}, g: ${g}, b: ${b} or h: ${c.h}, s: ${c.s}, v: ${c.v}`);
    } else {
      this.log.warn('Skipping color change while light bulb being off');
    }
    this.hsv = c;
  }

  getHSV(): HsvColor {
    return this.hsv;
  }

  turnOff(): void {
    this.pwm(0, 0, 0);
    this.hsv = { h: 0, s: 0, v: 0 };
  }
}
