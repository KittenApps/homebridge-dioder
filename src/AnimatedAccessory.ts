import type { PlatformAccessory, CharacteristicValue, Service, Logging } from 'homebridge';
import type { DioderAccessory } from './DioderAccessory';
import type { DioderPlatform } from './DioderPlatform';

const INTERVAL = 1000 / 30; // 30 FPS
const SPEED = 100; // 1..100 => 0.01..1
const OFFSET_CT = 5; // 140..500  => 28..100

export class AnimatedAccessory {
  public brightness: number;
  public offset: number;
  public speed: number;
  private on: boolean;
  private onS: boolean;
  private interval: NodeJS.Timeout | undefined;

  private readonly LEDservice: Service;
  private readonly FanService: Service;
  private readonly Characteristic;
  public readonly log: Logging;

  constructor(private readonly platform: DioderPlatform, private readonly accessory: PlatformAccessory, public readonly leds: DioderAccessory[], name: string) {
    const hap = this.platform.api.hap;
    this.Characteristic = hap.Characteristic;
    this.log = this.platform.log;

    this.on = false;
    this.onS = false;
    this.brightness = 0;
    this.offset = 50;
    this.speed = 0.5;
    this.interval = undefined;

    this.accessory.getService(hap.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Silizia')
      .setCharacteristic(this.Characteristic.Model, 'Fancy LED')
      .setCharacteristic(this.Characteristic.SerialNumber, '42');
    
    this.accessory.on('identify', () => this.identify());

    this.LEDservice = this.accessory.getService(hap.Service.Lightbulb) || this.accessory.addService(hap.Service.Lightbulb);
    this.LEDservice.setCharacteristic(this.Characteristic.Name, name);
    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.ColorTemperature).onGet(this.getColorTemperature.bind(this)).onSet(this.setColorTemperature.bind(this));

    this.FanService = this.accessory.getService(hap.Service.Fan) || this.accessory.addService(hap.Service.Fan);
    this.FanService.setCharacteristic(this.Characteristic.Name, `${name} Speed`);
    this.FanService.getCharacteristic(this.Characteristic.On).onGet(this.getOnS.bind(this)).onSet(this.setOnS.bind(this));
    this.FanService.getCharacteristic(this.Characteristic.RotationSpeed).onGet(this.getSpeed.bind(this)).onSet(this.setSpeed.bind(this));
  }

  identify(): void {
    this.log.info("Identify!");
  }
  
  setOn(on: CharacteristicValue): void {
    this.log.info(`rainbow setOn`, on);
    this.on = on as boolean;
    if (on){
      if (this.getBrightness() === 0){
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      }
      this.FanService.updateCharacteristic(this.Characteristic.On, true);
      this.onS = true;
      if (this.getSpeed() === 0){
        this.FanService.setCharacteristic(this.Characteristic.RotationSpeed, 50);
      }
      this.interval = setInterval(() => this.runAnimation(), INTERVAL);
      this.platform.setAnimationCancel(this.cancelAnimation.bind(this));
    } else {
      this.FanService.updateCharacteristic(this.Characteristic.On, false);
      this.onS = false;
      clearInterval(this.interval);
      this.interval = undefined;
      for (const led of this.leds) led.turnOff();
    }
  }

  getOn(): boolean {
    return this.on;
  }

  setOnS(on: CharacteristicValue): void {
    this.log.info("rainbow setOnS", on);
    this.onS = on as boolean;
    if (on){
      if (this.getSpeed() === 0){
        this.FanService.setCharacteristic(this.Characteristic.RotationSpeed, 50);
      }
      this.interval = setInterval(() => this.runAnimation(), INTERVAL);
      this.LEDservice.updateCharacteristic(this.Characteristic.On, true);
      this.on = true;
      if (this.getBrightness() === 0){
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      }
      this.platform.setAnimationCancel(this.cancelAnimation.bind(this));
    } else {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  getOnS(): boolean {
    return this.onS; // interval running
  }

  setBrightness(v: CharacteristicValue): void {
    this.log.info("rainbow setBrightness", v);
    this.brightness = v as number;
  }

  getBrightness(): number {
    return this.brightness;
  }

  setColorTemperature(v: CharacteristicValue): void {
    this.log.info("rainbow setColorTemperature", v);
    this.offset = (v as number) / OFFSET_CT;
  }

  getColorTemperature(): number {
    return this.offset * OFFSET_CT;
  }

  setSpeed(v: CharacteristicValue): void {
    this.log.info("rainbow speed", v);
    this.speed = (v as number) / SPEED;
  }

  getSpeed(): number {
    return this.speed * SPEED;
  }

  runAnimation(): void {
  }

  cancelAnimation() : void {
    clearInterval(this.interval);
    this.interval = undefined;
    this.LEDservice.updateCharacteristic(this.Characteristic.On, false);
    this.FanService.updateCharacteristic(this.Characteristic.On, false);
  }
}
