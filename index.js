"use strict";

const Gpio = require('pigpio').Gpio;
const colord = require("colord").colord;

const PWM_RANGE = 8000;
const GAMMA_COR = 2.8;

module.exports = (api) => {
  api.registerAccessory('Dioder', DioderAccessoryPlugin);
}

class DioderAccessoryPlugin {
  constructor(log, config, api) {
    this.log = log;
    this.Characteristic = api.hap.Characteristic;

    this.rPin = new Gpio(config['rPin'], {mode: Gpio.OUTPUT});
    this.gPin = new Gpio(config['gPin'], {mode: Gpio.OUTPUT});
    this.bPin = new Gpio(config['bPin'], {mode: Gpio.OUTPUT});
    this.rPin.pwmRange(PWM_RANGE);
    this.gPin.pwmRange(PWM_RANGE);
    this.bPin.pwmRange(PWM_RANGE);
    this.rPin.pwmWrite(0);
    this.gPin.pwmWrite(0);
    this.bPin.pwmWrite(0);
    this.log("PWM frequency:", this.rPin.getPwmFrequency());

    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Manufacturer, "Silizia")
      .setCharacteristic(this.Characteristic.Model, "Fancy LED");

    this.LEDservice = new api.hap.Service.Lightbulb(this.name);
    this.LEDservice.getCharacteristic(this.Characteristic.On).onGet(this.getOn.bind(this)).onSet(this.setOn.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).onGet(this.getBrightness.bind(this)).onSet(this.setBrightness.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).onGet(this.getHue.bind(this)).onSet(this.setHue.bind(this));
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).onGet(this.getSaturation.bind(this)).onSet(this.setSaturation.bind(this));
  }

  getServices() {
    return [this.informationService, this.LEDservice];
  }

  getCharacteristic(c) {
    return this.LEDservice.getCharacteristic(this.Characteristic[c]).value;
  }

  getOn() {
    return this.rPin.getPwmDutyCycle() > 0 || this.gPin.getPwmDutyCycle() > 0 || this.bPin.getPwmDutyCycle() > 0;
  }
  
  setOn(on) {
    if (on && this.rPin.getPwmDutyCycle() === 0 && this.gPin.getPwmDutyCycle() === 0 && this.bPin.getPwmDutyCycle() === 0){
      this.setHSV({ h: this.getCharacteristic('Hue'), s: this.getCharacteristic('Saturation'), v: this.getCharacteristic('Brightness') || 100 });
    } else {
      this.rPin.pwmWrite(0);
      this.gPin.pwmWrite(0);
      this.bPin.pwmWrite(0);
    }
  }

  setBrightness(v) {
    this.LEDservice.getCharacteristic(this.Characteristic.Brightness).updateValue(v);
    this.setHSV({ h: this.getCharacteristic('Hue'), s: this.getCharacteristic('Saturation'), v});
  }

  getBrightness() {
    return this.getHSV().v;
  }

  setHue(h) {
    this.LEDservice.getCharacteristic(this.Characteristic.Hue).updateValue(h);
    this.setHSV({ h, s: this.getCharacteristic('Saturation'), v: this.getCharacteristic('Brightness')});
  }

  getHue() {
    return this.getHSV().h;
  }

  setSaturation(s) {
    this.LEDservice.getCharacteristic(this.Characteristic.Saturation).updateValue(s);
    // always followed by setHue call, which calls this.setHSV()
  }

  getSaturation() {
    return this.getHSV().s;
  }

  setHSV(c) {
    const { r, g, b } = colord(c).toRgb();
    this.rPin.pwmWrite(Math.round(Math.pow(r / 255, GAMMA_COR) * PWM_RANGE));
    this.gPin.pwmWrite(Math.round(Math.pow(g / 255, GAMMA_COR) * PWM_RANGE));
    this.bPin.pwmWrite(Math.round(Math.pow(b / 255, GAMMA_COR) * PWM_RANGE));
    this.log(`set RGB to ${r}, ${g}, ${b}`)
  }

  getHSV() {
    return colord({ 
      r: Math.round(Math.pow(this.rPin.getPwmDutyCycle() / PWM_RANGE, 1 / GAMMA_COR) * 255),
      g: Math.round(Math.pow(this.gPin.getPwmDutyCycle() / PWM_RANGE, 1 / GAMMA_COR) * 255),
      b: Math.round(Math.pow(this.bPin.getPwmDutyCycle() / PWM_RANGE, 1 / GAMMA_COR) * 255)
    }).toHsv();
  }
}