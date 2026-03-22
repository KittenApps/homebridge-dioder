import { colord, HsvColor } from 'colord';

import type { CharacteristicValue, PlatformAccessory, Service, Logging } from 'homebridge';
import type { DioderPlatform } from './DioderPlatform';
import { type Rgpio } from 'hb-rpi-tools/GpioClient/Rgpio';

interface LedConfig {
  name: string;
  rPin: number;
  gPin: number;
  bPin: number;
}

const MIN_PWM = 31.4995 / 8000; // min pwm to get actually light from dioder, depends on PWM_RANGE
const GAMMA_COR = 2.8;

export class DioderAccessory {
  private readonly rPin: number;
  private readonly gPin: number;
  private readonly bPin: number;
  private hsv: HsvColor;
  private on: boolean;

  private readonly LEDservice: Service;
  private readonly Characteristic;
  private readonly log: Logging;

  constructor(private readonly platform: DioderPlatform, private readonly accessory: PlatformAccessory, private readonly rgpio: Rgpio) {
    const hap = platform.api.hap;
    this.Characteristic = hap.Characteristic;
    this.log = platform.log;
    this.rgpio = rgpio;
  
    this.rPin = accessory.context.config.rPin;
    this.rgpio.setPwm(this.rPin);
    this.rgpio.writePwm(this.rPin, 0);
    this.gPin = accessory.context.config.gPin;
    this.rgpio.setPwm(this.gPin);
    this.rgpio.writePwm(this.gPin, 0);
    this.bPin = accessory.context.config.bPin;
    this.rgpio.setPwm(this.bPin);
    this.rgpio.writePwm(this.bPin, 0);
    this.hsv = { h: 0, s: 0, v: 0};
    this.on = false;

    this.accessory.getService(hap.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Silizia')
      .setCharacteristic(this.Characteristic.Model, 'Fancy LED')
      .setCharacteristic(this.Characteristic.SerialNumber, '42');
    
    this.accessory.on('identify', () => this.identify());

    this.LEDservice = this.accessory.getService(hap.Service.Lightbulb) || this.accessory.addService(hap.Service.Lightbulb);
    this.LEDservice.setCharacteristic(this.Characteristic.Name, accessory.context.config.name);

    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).onGet(this.getHue.bind(this)).onSet(this.setHue.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).onGet(this.getSaturation.bind(this)).onSet(this.setSaturation.bind(this));
  }

  identify(): void {
    this.rgpio.writePwm(this.rPin, 0);
    this.rgpio.writePwm(this.gPin, 0);
    this.rgpio.writePwm(this.bPin, 0);
    setTimeout(() => {
      this.rgpio.writePwm(this.rPin, 1);
      this.rgpio.writePwm(this.gPin, 0);
      this.rgpio.writePwm(this.bPin, 0);
      setTimeout(() => {
        this.rgpio.writePwm(this.rPin, 0);
        this.rgpio.writePwm(this.gPin, 0);
        this.rgpio.writePwm(this.bPin, 0);
        if (this.getBrightness() > 0){
          setTimeout(() => {
            this.setHSV(this.hsv);
          }, 1000);
        }
      }, 3000);
    }, 1000);
    this.log.info("Identify!");
  }
  
  setOn(on: CharacteristicValue): void {
    this.log.info("setOn", on);
    this.on = on as boolean;
    if (on){
      this.platform.stopAnimation();
      if (this.getBrightness() === 0){
        this.hsv.v = 100;
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      } else {
        this.setHSV(this.hsv);
      }
    } else {
      this.rgpio.writePwm(this.rPin, 0);
      this.rgpio.writePwm(this.gPin, 0);
      this.rgpio.writePwm(this.bPin, 0);
    }
  }

  getOn(): boolean {
    if (this.platform.isAnimationRunning()) return false;
    return this.getBrightness() > 0;
  }

  setBrightness(v: CharacteristicValue): void {
    this.log.info("setBrightness", v);
    this.hsv.v = v as number;
    this.setHSV(this.hsv);
  }

  getBrightness(): number {
    return this.hsv.v;
  }

  setHue(h: CharacteristicValue): void {
    this.log.info("setHue", h);
    this.hsv.h = h as number;
    this.setHSV(this.hsv);
  }

  getHue(): number {
    return this.hsv.h;
  }

  setSaturation(s: CharacteristicValue): void {
    this.log.info("setSaturation", s);
    this.hsv.s = s as number;
    this.setHSV(this.hsv);
  }

  getSaturation(): number {
    return this.hsv.s;
  }

  setHSV(c: HsvColor, t?: boolean): void {
    if (t || (this.on && this.getBrightness() > 0)) {
      const { r, g, b } = colord(c).toRgb();
      this.rgpio.writePwm(this.rPin, Math.round(Math.pow(r / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
      this.rgpio.writePwm(this.gPin, Math.round(Math.pow(g / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
      this.rgpio.writePwm(this.bPin, Math.round(Math.pow(b / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
      if (!t) this.log.info(`set ${this.accessory.displayName} RGB to ${r}, ${g}, ${b}`)
    } else {
      this.log.warn('Skipping color change while light bulb being off');
    }
    
  }

  getHSV(): HsvColor {
    return this.hsv;
  }

  setRGB(r: number, g: number, b: number) {
    this.rgpio.writePwm(this.rPin, Math.round(Math.pow(r / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
    this.rgpio.writePwm(this.gPin, Math.round(Math.pow(g / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
    this.rgpio.writePwm(this.bPin, Math.round(Math.pow(b / 255, GAMMA_COR) * (1 - MIN_PWM) + MIN_PWM));
  }

  turnOff(): void {
    this.rgpio.writePwm(this.rPin, 0);
    this.rgpio.writePwm(this.gPin, 0);
    this.rgpio.writePwm(this.bPin, 0);
  }
}