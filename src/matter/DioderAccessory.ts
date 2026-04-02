import { colord, type HsvColor } from 'colord';
import type { MatterAccessory, Logging, API, MatterRequests } from 'homebridge';
import lg from 'lgpio';

import type { LedConfig } from './DioderPlatform';

const MIN_PWM = 0.5; // min pwm to get actually light from dioder, depends on PWM_RANGE
const PWM_FREQUENCY = 10000;
const GAMMA_COR = 2.8;

export default class DioderAccessory {
  private readonly accessory: MatterAccessory<Record<string, never>>;

  constructor(
    private readonly api: API,
    private readonly log: Logging,
    private readonly gpiochip: number,
    private readonly config: LedConfig,
    accessory?: MatterAccessory<Record<string, never>>
  ) {
    if (!DEV) {
      lg.gpioClaimOutput(gpiochip, this.config.rPin);
      lg.gpioClaimOutput(gpiochip, this.config.gPin);
      lg.gpioClaimOutput(gpiochip, this.config.bPin);
    }

    this.accessory = accessory ?? {
      UUID: this.api.hap.uuid.generate(this.config.name),
      displayName: this.config.name,
      deviceType: this.api.matter.deviceTypes.ExtendedColorLight,
      serialNumber: '42',
      manufacturer: 'Silizia',
      model: 'Fancy LED',
      clusters: {
        onOff: { onOff: false },
        levelControl: { currentLevel: 254, minLevel: 1, maxLevel: 254 },
        colorControl: { currentHue: 0, currentSaturation: 254, colorMode: this.api.matter.types.ColorControl.ColorMode.CurrentHueAndCurrentSaturation },
      },
      handlers: {
        onOff: { on: (): Promise<void> => this.handleOn(), off: (): void => this.handleOff() },
        levelControl: { moveToLevelWithOnOff: (request): void => this.handleSetLevel(request) },
        colorControl: { moveToHueAndSaturationLogic: (request): void => this.handleSetHueSaturation(request) },
      },
      context: {},
    };
  }

  getBrightness(): number {
    return (this.accessory?.clusters?.levelControl?.currentLevel ?? 254 / 254) * 100;
  }

  getHsv(): HsvColor {
    const mh = this.accessory?.clusters?.colorControl?.currentHue ?? 0;
    const ms = this.accessory?.clusters?.colorControl?.currentSaturation ?? 254;
    const v = this.getBrightness();
    return { h: (mh / 254) * 360, s: (ms / 254) * 100, v };
  }

  pwm(r: number, g: number, b: number): void {
    if (DEV) {
      this.log.info(`pwm r: ${r}, g: ${g}, b: ${b} for gpiochip: ${this.gpiochip} with freq: ${this.config.freq ?? PWM_FREQUENCY}`);
      this.log.info(`rpin ${this.config.rPin} to ${r === 0 ? 'off' : (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
      this.log.info(`gpin ${this.config.gPin} to ${g === 0 ? 'off' : (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
      this.log.info(`bpin ${this.config.bPin} to ${b === 0 ? 'off' : (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM}`);
    } else {
      lg.txPwm(this.gpiochip, this.config.rPin, this.config.freq ?? PWM_FREQUENCY, r === 0 ? 0 : (r / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, r === 0 ? 1 : 0);
      lg.txPwm(this.gpiochip, this.config.gPin, this.config.freq ?? PWM_FREQUENCY, g === 0 ? 0 : (g / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, g === 0 ? 1 : 0);
      lg.txPwm(this.gpiochip, this.config.bPin, this.config.freq ?? PWM_FREQUENCY, b === 0 ? 0 : (b / 255) ** GAMMA_COR * (100 - MIN_PWM) + MIN_PWM, 0, b === 0 ? 1 : 0);
    }
  }

  setHSV(c: HsvColor): void {
    if (c.v > 0) {
      const { r, g, b } = colord(c).toRgb();
      this.pwm(r, g, b);
      this.log.info(`set ${this.config.name} r: ${r}, g: ${g}, b: ${b} or h: ${c.h}, s: ${c.s}, v: ${c.v}`);
    } else {
      this.log.warn('Skipping color change while light bulb being off');
    }
  }

  // oxlint-disable-next-line typescript/require-await
  private async handleOn(): Promise<void> {
    this.log.info(`${this.config.name}: turning on.`);
    const hsv = this.getHsv();
    /*! if (hsv.v === 0) {
      await this.api.matter.updateAccessoryState(
        this.accessory.UUID,
        this.api.matter.clusterNames.LevelControl,
        { currentLevel: 254 }
      );
      hsv.v = 100;
    }*/
    this.setHSV(hsv);
  }

  private handleOff(): void {
    this.log.info(`${this.config.name}: turning off.`);
    this.pwm(0, 0, 0);
  }

  private handleSetLevel(request: MatterRequests.MoveToLevel): void {
    this.log.info(`${this.config.name}: MoveToLevel request: ${JSON.stringify(request)}`);
    const { level /* transitionTime */ } = request;
    const hsv = this.getHsv();
    hsv.v = (level / 254) * 100;
    this.setHSV(hsv);
    this.log.info(`${this.config.name}: setting brightness to ${hsv.v}%.`);
  }

  private handleSetHueSaturation(request: { hue: number; saturation: number; transitionTime: number }): void {
    this.log.info(`${this.config.name}: MoveToHueAndSaturation request: ${JSON.stringify(request)}`);
    const { hue, saturation /* transitionTime */ } = request;
    const hsv = { h: (hue / 254) * 360, s: (saturation / 254) * 100, v: this.getBrightness() };
    this.setHSV(hsv);
    this.log.info(`${this.config.name}: setting color to h: ${hsv.h}°, s: ${hsv.s}%, v: ${hsv.v}%.`);
  }

  getAccessory(): MatterAccessory<Record<string, never>> {
    return this.accessory;
  }
}
