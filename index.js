"use strict";

const Gpio = require('pigpio').Gpio;
const colord = require("colord").colord;

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
    // ToDo: Do we need to updateCharacteristics here?
    if (on){
      this.setHSV({ h: this.getCharacteristic('Hue'), s: this.getCharacteristic('Saturation'), v: this.getCharacteristic('Brightness') || 100 });
    } else {
      this.rPin.pwmWrite(0);
      this.gPin.pwmWrite(0);
      this.bPin.pwmWrite(0);
    }
  }

  setBrightness(v) {
    this.setHSV({ h: this.getCharacteristic('Hue'), s: this.getCharacteristic('Saturation'), v});
  }

  getBrightness() {
    return this.getHSV().v;
  }

  setHue(h) {
    this.setHSV({ h, s: this.getCharacteristic('Saturation'), v: this.getCharacteristic('Brightness')});
  }

  getHue() {
    return this.getHSV().h;
  }

  setSaturation(s) {
    this.setHSV({ h: this.getCharacteristic('Hue'), s, v: this.getCharacteristic('Brightness')});
  }

  getSaturation() {
    return this.getHSV().s;
  }

  setHSV(c) {
    // ToDo: Color Correction
    const { r, g, b } = colord(c).toRgb();
    this.rPin.pwmWrite(r);
    this.gPin.pwmWrite(g);
    this.bPin.pwmWrite(b);
  }

  getHSV() {
    return colord({ r: this.rPin.getPwmDutyCycle(), g: this.gPin.getPwmDutyCycle(), b: this.bPin.getPwmDutyCycle() }).toHsv();
  }
}