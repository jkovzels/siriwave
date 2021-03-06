import raf from 'raf';

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

    this.ctx = opt.ctx;
    this.speed = opt.speed || 0.1;
    this.x = opt.x;
    this.y = opt.y;
    this.height = opt.height;
    this.width = opt.width;
    /** Represents the middle line along y-axis in the allowed for drawing bounding box */

    this.midLine = this.y + this.height / 2;
    this.definition = opt.definition; //** Resolution of the curve. Smaller value leads to smoother curve */

    this.resolution = opt.resolution || 0.02;
    this.GRAPH_X = 25;
    this.SPEED_FACTOR = 1;
    this.DEAD_PX = 2;
    this.ATT_FACTOR = 4;
    this.DECAY_SPEED = 0.05;
    this.respawn();
  }

  _createClass(iOS9Curve, [{
    key: "getRandom",
    value: function getRandom(minOrArray, max) {
      var min = 0;

      if (Array.isArray(minOrArray)) {
        min = minOrArray[0];
        max = minOrArray[1];
      } else {
        min = minOrArray;
      }

      return Math.random() * (max - min) + min;
    }
  }, {
    key: "getRandomInt",
    value: function getRandomInt(minOrArray, max) {
      var min = 0;

      if (Array.isArray(minOrArray)) {
        min = minOrArray[0];
        max = minOrArray[1];
      } else {
        min = minOrArray;
      }

      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }, {
    key: "respawn",
    value: function respawn() {
      this.step = 0;
      /**
       * Number of curves produced by the wave along y-axis
       */

      this.curveCount = this.getRandomInt(this.definition.curveCountRange); //original: [2, 5]

      this.phases = new Array(this.curveCount);
      this.rndOffsets = new Array(this.curveCount);
      this.rndSpeeds = new Array(this.curveCount);
      /** Minimal allowed aplitude of the curve */

      this.finalAmplitudes = new Array(this.curveCount);
      this.rndWidths = new Array(this.curveCount);
      this.amplitudes = new Array(this.curveCount);
      this.despawnSteps = new Array(this.curveCount);
      this.ripples = new Array(this.curveCount);

      for (var i = 0; i < this.curveCount; i++) {
        this.respawnSingle(i);
      }
    }
  }, {
    key: "respawnSingle",
    value: function respawnSingle(curveIndex) {
      this.phases[curveIndex] = 1;
      this.amplitudes[curveIndex] = this.getRandom(0, 1);
      this.despawnSteps[curveIndex] = 0; //this.getRandom(0, 0); //original [500; 2000]
      //moves the ripples off center and makes it lower. [-5, 5] is about a max range 

      this.rndOffsets[curveIndex] = this.getRandom(Math.round(-4 / this.curveCount), Math.round(4 / this.curveCount)); //[-3; 3]

      this.rndSpeeds[curveIndex] = this.getRandom(0.5, 1); //[0.5; 1]

      this.finalAmplitudes[curveIndex] = this.getRandom(0.3, 1); //origin: [0.3; 1]

      this.rndWidths[curveIndex] = this.getRandom(1, 6); //[1; 3]
      //keep it 0 to have one symmetrical curves.
      //With curveCount set to 1 non-zero value will produce symetrical ripples within the curve

      this.ripples[curveIndex] = 0; //this.getRandom(0, 0); //original: [-1, 1]  
    }
  }, {
    key: "bellFunc",
    value: function bellFunc(x) {
      return Math.pow(this.ATT_FACTOR / (this.ATT_FACTOR + Math.pow(x, 2)), this.ATT_FACTOR);
    }
  }, {
    key: "yRelativePos",
    value: function yRelativePos(xPos) {
      var y = 0;

      for (var ci = 0; ci < this.curveCount; ci++) {
        var cc = this.curveCount;
        var offset = (ci - (cc - 1) / 2) * cc; //add dynamic random offset

        offset += this.rndOffsets[ci]; //rWidth defines the speed of change on the bell function 

        var rWidth = 1 / this.rndWidths[ci];
        var x = xPos * rWidth - offset;
        var z = this.bellFunc(x);
        var a = this.amplitudes[ci]; //ignore this for now

        var p = this.ripples[ci] * x - this.phases[ci];
        var sin = Math.sin(p);
        y += Math.abs(a * z * sin);
      }

      return y / this.curveCount;
    }
  }, {
    key: "ypos",
    value: function ypos(pos) {
      return this.height * this.yRelativePos(pos) * this.bellFunc(pos / this.GRAPH_X * 2);
    }
  }, {
    key: "xpos",
    value: function xpos(i) {
      return this.width * ((i + this.GRAPH_X) / (this.GRAPH_X * 2)) + this.x;
    }
  }, {
    key: "draw",
    value: function draw(amplitude) {
      var ctx = this.ctx;

      if (this.definition.throughline) {
        this.drawThroughline(ctx, this.definition);
        return;
      }

      var xAtMaxY = this.width / 2 + this.x;
      var maxY = -Infinity;
      var Y = [];
      var X = []; //it itterates over [-25;25] range with looks very artificial

      for (var i = -this.GRAPH_X; i <= this.GRAPH_X; i += this.resolution) {
        var _x = this.xpos(i);

        X.push(_x);

        var _y = this.ypos(i) * amplitude;

        if (maxY < _y) {
          maxY = _y;
          xAtMaxY = _x;
        }

        Y.push(_y);
      }

      var yMax = this.height / 2; // //avoid clipping

      if (maxY > yMax) {
        for (var _i = 0; _i < Y.length; _i++) {
          Y[_i] = Y[_i] / maxY * yMax;
        }

        maxY = yMax;
      }

      ctx.beginPath();
      ctx.moveTo(X[0], this.midLine);

      for (var _i2 = 0; _i2 < Y.length; _i2++) {
        ctx.lineTo(X[_i2], this.midLine - Y[_i2]);
      } //draw mirror wave under the middline.


      for (var _i3 = Y.length - 1; _i3 >= 0; _i3--) {
        ctx.lineTo(X[_i3], this.midLine + Y[_i3] * this.definition.mirrorFactor);
      }

      ctx.closePath();
      var x = xAtMaxY;
      var y = this.midLine;
      var r = maxY;
      var gradient = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 0.4);
      gradient.addColorStop(0, "rgba(".concat(this.definition.rgb.join(), ", ").concat(this.definition.alphaStart, ")"));
      gradient.addColorStop(1, "rgba(".concat(this.definition.rgb.join(), ", ").concat(this.definition.alphaEnd, ")"));
      ctx.fillStyle = gradient;
      ctx.fill();

      if (maxY < this.DEAD_PX && this.prevMaxY > maxY) {
        this.respawn();
      } else {
        this.prevMaxY = maxY;
        var ampDelta = Math.abs(this.masterAmplitude - amplitude);

        if (ampDelta < amplitude * 0.1) {
          //if value of amp in 2 concequent frames is less then 10% we consider it noise and despawning the wave;
          this.despawn();
        }
      }

      this.masterAmplitude = amplitude;
    }
    /** Change amplitude and phase depending on the current tick and random factor */

  }, {
    key: "despawn",
    value: function despawn() {
      this.step++;

      for (var ci = 0; ci < this.curveCount; ci++) {
        this.amplitudes[ci] -= this.DECAY_SPEED;
        this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finalAmplitudes[ci]);
        this.phases[ci] = (this.phases[ci] + this.speed * this.rndSpeeds[ci] * this.SPEED_FACTOR) % (2 * Math.PI);
      }
    }
  }, {
    key: "drawThroughline",
    value: function drawThroughline(ctx, definition) {
      var coordinates = [this.x, 0, this.width + this.x, 0];
      var gradient = ctx.createLinearGradient.apply(ctx, coordinates);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.1, "rgba(".concat(definition.rgb.join(), ", ").concat(definition.alphaStart, "})"));
      gradient.addColorStop(0.9, "rgba(".concat(definition.rgb, ", ").concat(definition.alphaStart, ")"));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect.apply(ctx, [this.x, this.midLine, this.width, 1]);
    }
  }], [{
    key: "getDefinitions",
    value: function getDefinitions(definitions) {
      if (!definitions || definitions.length == 0) {
        return [//defaults
        {
          rgb: '255,255,255',
          alphaStart: 1,
          alphaEnd: 1,
          throughline: true
        }, {
          // blue
          rgb: [15, 82, 169],
          alphaStart: .5,
          alphaEnd: .2
        }, {
          // red
          rgb: [173, 57, 76],
          alphaStart: .5,
          alphaEnd: .2
        }, {
          // green
          color: [48, 220, 155],
          alphaStart: .5,
          alphaEnd: .2
        }];
      } //assign default 


      for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];
        definition = Object.assign({
          alphaStart: .5,
          alphaEnd: .2,
          mirrorFactor: 1,
          curveCountRange: [1, 1]
        }, definition);
        definitions[i] = definition;
      }

      return definitions;
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
      speed: 0.2,
      amplitude: 1,
      frequency: 6,
      color: '#fff',
      cover: false,
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      autostart: false,
      resolution: 0.02
    }, opt);
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

    this.x = Number(this.opt.x);
    /** Bottom padding in pixels of waveform allowed area on the canvas */

    this.y = Number(this.opt.y);
    /**
     * Width of the canvas multiplied by pixel ratio
     */

    this.width = Number(this.opt.width);
    /**
     * Height of the canvas multiplied by pixel ratio
     */

    this.height = Number(this.opt.height);
    /**
     * Color of the wave (used in Classic iOS)
     */

    this.color = this.opt.color;
    /**
     * 2D Context from Canvas
     */

    this.ctx = this.canvas.getContext('2d');
    /**
     * Curves objects to animate
     */

    this.curves = []; // Instantiate all curves based on the style

    if (this.opt.style === 'ios9') {
      var definitions = iOS9Curve.getDefinitions(this.opt.curveDefinitions);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = definitions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var definition = _step.value;
          this.curves.push(new iOS9Curve({
            ctx: this.ctx,
            definition: definition,
            speed: opt.speed,
            resolution: opt.resolution,
            x: opt.x,
            y: opt.y,
            height: opt.height,
            width: opt.width
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
          var def = _step2.value;
          this.curves.push(new Curve({
            ctrl: this,
            definition: def
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
     * Clear the canvas
     * @memberof Siriwave
     */

  }, {
    key: "clear",
    value: function clear() {
      if (this.color) {
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(this.x, this.y, this.width, this.height);
      } //leave for debugging
      //this.ctx.strokeStyle = '#FFF';
      //this.ctx.strokeRect(this.x, this.y, this.width, this.height);

    }
    /**
     * Draw all curves
     * @memberof Siriwave
     */

  }, {
    key: "drawFrame",
    value: function drawFrame() {
      var amplitide = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
      this.clear();
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.curves[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var curve = _step3.value;
          curve.draw(amplitide);
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
     * Clear the space, \calculate new steps and draws
     * @returns
     * @memberof Siriwave
     */

  }, {
    key: "startDrawCycle",
    value: function startDrawCycle() {
      if (this.run === false) return;
      this.drawFrame(1);
      raf(this.startDrawCycle.bind(this));
    }
    /* API */

    /**
     * Start the animation
     * @memberof Siriwave
     */

  }, {
    key: "start",
    value: function start() {
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
      this.run = false;
    }
  }]);

  return Siriwave;
}();

export { Siriwave };
