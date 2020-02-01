import raf from 'raf';
import lerp from 'lerp';

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var iOS9Curve =
/*#__PURE__*/
function () {
  function iOS9Curve() {
    var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, iOS9Curve);

    this.controller = opt.ctrl;
    this.speed = opt;
    this.xOffset = opt.ctrl.xOffset;
    this.yOffset = opt.ctrl.yOffset;
    this.height = opt.ctrl.height;
    this.width = opt.ctrl.width;
    this.midLine = this.yOffset + this.height / 2;
    this.definition = opt.definition;
    this.pixelDepth = opt.pixelDepth;
    this.GRAPH_X = 25;
    this.SPEED_FACTOR = 1;
    this.DEAD_PX = 2;
    this.ATT_FACTOR = 4;
    this.DESPAWN_FACTOR = 0.02;
    this.NOOFCURVES_RANGES = [2, 5];
    this.AMPLITUDE_RANGES = [0.3, 1];
    this.OFFSET_RANGES = [-3, 3];
    this.WIDTH_RANGES = [1, 3];
    this.SPEED_RANGES = [0.5, 1];
    this.DESPAWN_TIMEOUT_RANGES = [500, 2000];
    this.respawn();
  }

  _createClass(iOS9Curve, [{
    key: "getRandomRange",
    value: function getRandomRange(range) {
      return range[0] + Math.random() * (range[1] - range[0]);
    }
  }, {
    key: "respawnSingle",
    value: function respawnSingle(curveIndex) {
      this.phases[curveIndex] = 0;
      this.amplitudes[curveIndex] = 0;
      this.despawnTimeouts[curveIndex] = this.getRandomRange(this.DESPAWN_TIMEOUT_RANGES);
      this.offsets[curveIndex] = this.getRandomRange(this.OFFSET_RANGES);
      this.speeds[curveIndex] = this.getRandomRange(this.SPEED_RANGES);
      this.finalAmplitudes[curveIndex] = this.getRandomRange(this.AMPLITUDE_RANGES);
      this.widths[curveIndex] = this.getRandomRange(this.WIDTH_RANGES);
      this.verses[curveIndex] = this.getRandomRange([-1, 1]);
    }
  }, {
    key: "respawn",
    value: function respawn() {
      this.spawnAt = Date.now();
      this.noOfCurves = Math.floor(this.getRandomRange(this.NOOFCURVES_RANGES));
      this.phases = new Array(this.noOfCurves);
      this.offsets = new Array(this.noOfCurves);
      this.speeds = new Array(this.noOfCurves);
      this.finalAmplitudes = new Array(this.noOfCurves);
      this.widths = new Array(this.noOfCurves);
      this.amplitudes = new Array(this.noOfCurves);
      this.despawnTimeouts = new Array(this.noOfCurves);
      this.verses = new Array(this.noOfCurves);

      for (var curveIndex = 0; curveIndex < this.noOfCurves; curveIndex++) {
        this.respawnSingle(curveIndex);
      }
    }
  }, {
    key: "globalAttFn",
    value: function globalAttFn(x) {
      return Math.pow(this.ATT_FACTOR / (this.ATT_FACTOR + Math.pow(x, 2)), this.ATT_FACTOR);
    }
  }, {
    key: "yRelativePos",
    value: function yRelativePos(i) {
      var y = 0;

      for (var ci = 0; ci < this.noOfCurves; ci++) {
        // Generate a static T so that each curve is distant from each other
        var t = 4 * (-1 + ci / (this.noOfCurves - 1) * 2); // but add a dynamic offset

        t += this.offsets[ci];
        var k = 1 / this.widths[ci];
        var x = i * k - t;
        y += Math.abs(this.amplitudes[ci] * Math.sin(this.verses[ci] * x - this.phases[ci]) * this.globalAttFn(x));
      } // Divide for NoOfCurves so that y <= 1


      return y / this.noOfCurves;
    }
  }, {
    key: "_ypos",
    value: function _ypos(i) {
      return this.AMPLITUDE_FACTOR() * this.midLine * this.controller.amplitude * this.yRelativePos(i) * this.globalAttFn(i / this.GRAPH_X * 2);
    }
  }, {
    key: "_xpos",
    value: function _xpos(i) {
      return this.width * ((i + this.GRAPH_X) / (this.GRAPH_X * 2));
    }
  }, {
    key: "draw",
    value: function draw() {
      var ctx = this.controller.ctx; //ctx.globalAlpha = 0.7;
      //ctx.globalCompositeOperation = 'lighter';

      if (this.definition.supportLine) {
        return this.drawSupportLine(ctx, this.definition.color);
      }

      for (var ci = 0; ci < this.noOfCurves; ci++) {
        if (this.spawnAt + this.despawnTimeouts[ci] <= Date.now()) {
          this.amplitudes[ci] -= this.DESPAWN_FACTOR;
        } else {
          this.amplitudes[ci] += this.DESPAWN_FACTOR;
        }

        this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finalAmplitudes[ci]);
        this.phases[ci] = (this.phases[ci] + this.controller.speed * this.speeds[ci] * this.SPEED_FACTOR) % (2 * Math.PI);
      }

      var maxY = -Infinity;

      var _arr = [1, -1];

      for (var _i = 0; _i < _arr.length; _i++) {
        var sign = _arr[_i];
        ctx.beginPath();

        for (var i = -this.GRAPH_X; i <= this.GRAPH_X; i += this.pixelDepth) {
          var x = this._xpos(i);

          var y = this._ypos(i);

          ctx.lineTo(x, this.midLine - sign * y);
          maxY = Math.max(maxY, y);
        }

        ctx.closePath();
        ctx.fillStyle = "rgba(".concat(this.definition.color, ", .5)");
        ctx.strokeStyle = "rgba(".concat(this.definition.color, ", .5)");
        ctx.fill();
      }

      if (maxY < this.DEAD_PX && this.prevMaxY > maxY) {
        this.respawn();
      }

      this.prevMaxY = maxY;
    }
  }, {
    key: "drawSupportLine",
    value: function drawSupportLine(ctx, colorDef) {
      var coordinates = [this.xOffset, 0, this.width + this.xOffset, 0];
      var gradient = ctx.createLinearGradient.apply(ctx, coordinates);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.1, "rgba(".concat(colorDef, ", 1)"));
      gradient.addColorStop(0.9, "rgba(".concat(colorDef, ", 1)"));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect.apply(ctx, [this.xOffset, this.midLine, this.width, 1]);
    }
  }], [{
    key: "getDefinition",
    value: function getDefinition(waveColors) {
      return Object.assign([{
        color: '255,255,255',
        supportLine: true
      }, {
        // blue
        color: '15, 82, 169'
      }, {
        // red
        color: '173, 57, 76'
      }, {
        // green
        color: '48, 220, 155'
      }], waveColors);
    }
  }, {
    key: "AMPLITUDE_FACTOR",
    get: function get() {
      return 0.8;
    }
  }]);

  return iOS9Curve;
}();

var Siriwave =
/*#__PURE__*/
function () {
  function Siriwave() {
    var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Siriwave);

    if (!opt.canvas) {
      throw new Error("Canvas is required");
    }
    /**
     * Canvas DOM Element where curves will be drawn
     */


    this.canvas = opt.canvas; // In this.opt you could find definitive opt with defaults values

    this.opt = Object.assign({
      style: 'ios',
      ratio: 1,
      speed: 0.2,
      amplitude: 1,
      frequency: 6,
      color: '#fff',
      cover: false,
      xOffset: 0,
      yOffset: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      autostart: false,
      pixelDepth: 0.02,
      lerpSpeed: 0.1
    }, opt);
    /**
     * Phase of the wave (passed to Math.sin function)
     */

    this.phase = 0;
    /**
     * Boolean value indicating the the animation is running
     */

    this.run = false;
    /**
     * Actual speed of the animation. Is not safe to change this value directly, use `setSpeed` instead.
     */

    this.speed = Number(this.opt.speed);
    /**
     * Actual amplitude of the animation. Is not safe to change this value directly, use `setAmplitude` instead.
     */

    this.amplitude = Number(this.opt.amplitude);
    /** Left and right padding in pixels of waveform allowed area on the canvas */

    this.xOffset = Number(this.opt.xOffset);
    /** Bottom padding in pixels of waveform allowed area on the canvas */

    this.yOffset = Number(this.opt.yOffset);
    /**
     * Width of the canvas multiplied by pixel ratio
     */

    this.width = Number(this.opt.ratio * this.opt.width);
    /**
     * Height of the canvas multiplied by pixel ratio
     */

    this.height = Number(this.opt.ratio * this.opt.height);
    /**
     * Color of the wave (used in Classic iOS)
     */

    this.color = "rgb(".concat(this.hex2rgb(this.opt.color), ")");
    /**
     * An object containing controller variables that need to be interpolated
     * to an another value before to be actually changed
     */

    this.interpolation = {
      speed: this.speed,
      amplitude: this.amplitude
    };
    /**
     * 2D Context from Canvas
     */

    this.ctx = this.canvas.getContext('2d');
    /**
     * Curves objects to animate
     */

    this.curves = []; // Instantiate all curves based on the style

    if (this.opt.style === 'ios9') {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = iOS9Curve.getDefinition(this.opt.waveColors || [])[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var def = _step.value;
          this.curves.push(new iOS9Curve({
            ctrl: this,
            definition: def,
            pixelDepth: this.opt.pixelDepth
          }));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return != null) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    } else {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Curve.getDefinition()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _def = _step2.value;
          this.curves.push(new Curve({
            ctrl: this,
            definition: _def
          }));
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    } // Start the animation


    if (opt.autostart) {
      this.start();
    }
  }
  /**
   * Convert an HEX color to RGB
   * @param {String} hex
   * @returns RGB value that could be used
   * @memberof Siriwave
   */


  _createClass(Siriwave, [{
    key: "hex2rgb",
    value: function hex2rgb(hex) {
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
      });
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? "".concat(parseInt(result[1], 16).toString(), ",").concat(parseInt(result[2], 16).toString(), ",").concat(parseInt(result[3], 16).toString()) : null;
    }
    /**
     * Interpolate a property to the value found in $.interpolation
     * @param {String} propertyStr
     * @returns
     * @memberof Siriwave
     */

  }, {
    key: "lerpProp",
    value: function lerpProp(propertyStr) {
      this[propertyStr] = lerp(this[propertyStr], this.interpolation[propertyStr], this.opt.lerpSpeed);

      if (this[propertyStr] - this.interpolation[propertyStr] === 0) {
        this.interpolation[propertyStr] = null;
      }

      return this[propertyStr];
    }
    /**
     * Clear the canvas
     * @memberof Siriwave
     */

  }, {
    key: "_clear",
    value: function _clear() {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillRect(this.xOffset, this.yOffset, this.width, this.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }
    /**
     * Draw all curves
     * @memberof Siriwave
     */

  }, {
    key: "drawFrame",
    value: function drawFrame(amplitide) {
      if (amplitide || amplitide === 0) {
        this.setAmplitude(amplitide);
      }

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.curves[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var curve = _step3.value;
          curve.draw();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
    /**
     * Clear the space, interpolate values, calculate new steps and draws
     * @returns
     * @memberof Siriwave
     */

  }, {
    key: "startDrawCycle",
    value: function startDrawCycle() {
      if (this.run === false) return;

      this._clear(); // Interpolate values


      if (this.interpolation.amplitude !== null) this.lerpProp('amplitude');
      if (this.interpolation.speed !== null) this.lerpProp('speed');
      this.drawFrame();
      this.phase = (this.phase + Math.PI / 2 * this.speed) % (2 * Math.PI);
      raf(this.startDrawCycle.bind(this), 20);
    }
    /* API */

    /**
     * Start the animation
     * @memberof Siriwave
     */

  }, {
    key: "start",
    value: function start() {
      this.phase = 0;
      this.run = true;
      this.startDrawCycle();
    }
    /**
     * Stop the animation
     * @memberof Siriwave
     */

  }, {
    key: "stop",
    value: function stop() {
      this.phase = 0;
      this.run = false;
    }
    /**
     * Set a new value for a property (interpolated)
     * @param {String} propertyStr
     * @param {Number} v
     * @memberof Siriwave
     */

  }, {
    key: "set",
    value: function set(propertyStr, v) {
      this.interpolation[propertyStr] = Number(v);
    }
    /**
     * Set a new value for the speed property (interpolated)
     * @param {Number} v
     * @memberof Siriwave
     */

  }, {
    key: "setSpeed",
    value: function setSpeed(v) {
      this.set('speed', v);
    }
    /**
     * Set a new value for the amplitude property (interpolated)
     * @param {Number} v
     * @memberof Siriwave
     */

  }, {
    key: "setAmplitude",
    value: function setAmplitude(v) {
      this.set('amplitude', v);
    }
  }]);

  return Siriwave;
}();

export { Siriwave };
