import type { AccessoryPlugin, HAP, CharacteristicValue, Logging, Service } from 'homebridge';
import type { DioderAccessory } from './DioderAccessory';

const INTERVAL = 100;
const SPEED = 5;
const OFFSET = 50;
const SATURATION = 100;

export class RainbowAccessory implements AccessoryPlugin {
  private readonly Characteristic;
  public readonly name: string;

  private brightness: number;
  private currentHue: number;
  private on: boolean;
  private interval: NodeJS.Timeout | undefined;

  private readonly LEDservice: Service;
  private readonly informationService: Service;

  constructor(private readonly log: Logging, private readonly leds: DioderAccessory[], hap: HAP) {
    this.name = "Rainbow Effect";
    this.Characteristic = hap.Characteristic;
    this.on = false;
    this.brightness = 0;
    this.currentHue = 0;
    this.interval = undefined;

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Manufacturer, "Silizia")
      .setCharacteristic(this.Characteristic.Model, "Fancy LED");

    this.LEDservice = new hap.Service.Lightbulb(this.name);
    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
  }

  getServices(): Service[] {
    return [this.informationService, this.LEDservice];
  }

  identify(): void {
    this.log("Identify!");
  }
  
  setOn(on: CharacteristicValue): void {
    this.log("rainbow setOn", on);
    this.on = on as boolean;
    if (on){
      if (this.getBrightness() === 0){
        this.brightness = 100;
        this.LEDservice.setCharacteristic(this.Characteristic.Brightness, 100);
      }
      this.interval = setInterval(this.runAnimation, INTERVAL);
    } else {
      clearInterval(this.interval);
    }
  }

  getOn(): boolean {
    return this.on; // Intervall running
  }

  setBrightness(v: CharacteristicValue): void {
    this.log("rainbow setBrightness", v);
    this.brightness = v as number;
  }

  getBrightness(): number {
    return this.brightness;
  }

  runAnimation(): void {
    for (let i = 0; i < this.leds.length; i++){
      this.leds[i].setHSV({
        h: (this.currentHue + i * OFFSET) % 360,
        s: SATURATION,
        v: this.brightness
      }, true);
    }
    this.currentHue *= SPEED;
  }
}
