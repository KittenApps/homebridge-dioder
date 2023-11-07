import { Gpio } from 'pigpio';
import { colord, HsvColor } from 'colord';

import type { AccessoryPlugin, HAP, CharacteristicValue, Logging, Service } from 'homebridge';
type LEDCharacteristic = 'Brightness' | 'Hue' | 'Saturation';
export interface LedConfig {
  name: string;
  rPin: number;
  gPin: number;
  bPin: number;
}

const PWM_RANGE = 8000;
const MIN_PWM = 31.4995; // min pwm to get actually light from dioder, depends on PWM_RANGE
const GAMMA_COR = 2.8;

export class DioderAccessory implements AccessoryPlugin {
  private readonly Characteristic;

  private readonly rPin: Gpio;
  private readonly gPin: Gpio;
  private readonly bPin: Gpio;
  public readonly name: string;
  private hsv: HsvColor;

  private readonly LEDservice: Service;
  private readonly informationService: Service;

  constructor(private readonly log: Logging, config: LedConfig, hap: HAP) {
    this.name = config.name;
    this.Characteristic = hap.Characteristic;

    this.rPin = new Gpio(config.rPin, { mode: Gpio.OUTPUT });
    this.gPin = new Gpio(config.gPin, { mode: Gpio.OUTPUT });
    this.bPin = new Gpio(config.bPin, { mode: Gpio.OUTPUT });
    this.rPin.pwmRange(PWM_RANGE);
    this.gPin.pwmRange(PWM_RANGE);
    this.bPin.pwmRange(PWM_RANGE);
    this.rPin.pwmWrite(0);
    this.gPin.pwmWrite(0);
    this.bPin.pwmWrite(0);
    this.hsv = { h: 0, s: 0, v: 0};
    this.log("PWM frequency:", this.rPin.getPwmFrequency());

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Silizia")
      .setCharacteristic(this.Characteristic.Model, "Fancy LED");

    this.LEDservice = new hap.Service.Lightbulb(config.name);
    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).onGet(this.getHue.bind(this)).onSet(this.setHue.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).onGet(this.getSaturation.bind(this)).onSet(this.setSaturation.bind(this));
  }

  getServices(): Service[] {
    return [this.informationService, this.LEDservice];
  }

  identify(): void {
    this.rPin.pwmWrite(0);
    this.gPin.pwmWrite(0);
    this.bPin.pwmWrite(0);
    setTimeout(() => {
      this.rPin.pwmWrite(PWM_RANGE);
      this.gPin.pwmWrite(0);
      this.bPin.pwmWrite(0);
      setTimeout(() => {
        this.rPin.pwmWrite(0);
        this.gPin.pwmWrite(0);
        this.bPin.pwmWrite(0);
        if (this.getBrightness() > 0){
          setTimeout(() => {
            this.setHSV(this.hsv);
          }, 1000);
        }
      }, 3000);
    }, 1000);
    this.log("Identify!");
  }

  getCharacteristicValue(c: LEDCharacteristic): number {
    return this.LEDservice.getCharacteristic(this.Characteristic[c]).value as number;
  }
  
  setOn(on: CharacteristicValue): void {
    this.log("setOn", on);
    if (on){
      if (this.getBrightness() === 0){
        this.hsv.v = 100;
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      } else {
        this.setHSV(this.hsv);
      }
    } else {
      this.rPin.pwmWrite(0);
      this.gPin.pwmWrite(0);
      this.bPin.pwmWrite(0);
    }
  }

  getOn(): boolean {
    return this.rPin.getPwmDutyCycle() >= MIN_PWM || this.gPin.getPwmDutyCycle() >= MIN_PWM || this.bPin.getPwmDutyCycle() >= MIN_PWM;
  }

  setBrightness(v: CharacteristicValue): void {
    this.log("setBrightness", v);
    this.hsv.v = v as number;
    this.setHSV(this.hsv);
  }

  getBrightness(): number {
    return this.hsv.v;
  }

  setHue(h: CharacteristicValue): void {
    this.log("setHue", h);
    this.hsv.h = h as number;
    this.setHSV(this.hsv);
  }

  getHue(): number {
    return this.hsv.h;
  }

  setSaturation(s: CharacteristicValue): void {
    this.log("setSaturation", s);
    this.hsv.s = s as number;
    this.setHSV(this.hsv);
  }

  getSaturation(): number {
    return this.hsv.s;
  }

  setHSV(c: HsvColor): void {
    if (this.getBrightness() > 0) {
      const { r, g, b } = colord(c).toRgb();
      this.rPin.pwmWrite(Math.round(Math.pow(r / 255, GAMMA_COR) * (PWM_RANGE - MIN_PWM) + MIN_PWM));
      this.gPin.pwmWrite(Math.round(Math.pow(g / 255, GAMMA_COR) * (PWM_RANGE - MIN_PWM) + MIN_PWM));
      this.bPin.pwmWrite(Math.round(Math.pow(b / 255, GAMMA_COR) * (PWM_RANGE - MIN_PWM) + MIN_PWM));
      this.log(`set RGB to ${r}, ${g}, ${b}`)
    } else {
      this.log.warn('Skipping color change while light bulb being off');
    }
    
  }

  getHSV(): HsvColor {
    return colord({ 
      r: Math.round(Math.pow((this.rPin.getPwmDutyCycle() - MIN_PWM) / (PWM_RANGE - MIN_PWM), 1 / GAMMA_COR) * 255),
      g: Math.round(Math.pow((this.gPin.getPwmDutyCycle() - MIN_PWM) / (PWM_RANGE - MIN_PWM), 1 / GAMMA_COR) * 255),
      b: Math.round(Math.pow((this.bPin.getPwmDutyCycle() - MIN_PWM) / (PWM_RANGE - MIN_PWM), 1 / GAMMA_COR) * 255)
    }).toHsv();
  }
}