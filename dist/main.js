'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var raf = _interopDefault(require('raf'));
var lerp = _interopDefault(require('lerp'));

class iOS9Curve {
	constructor(opt = {}) {
		this.ctrl = opt.ctrl;

		this.xOffset = opt.ctrl.xOffset;
		this.yOffset = opt.ctrl.yOffset;
		this.height = opt.ctrl.height;
		this.width = opt.ctrl.width;

		this.midLine = this.yOffset + this.height / 2;

		this.definition = opt.definition;

		this.GRAPH_X = 25;
		this.AMPLITUDE_FACTOR = 0.8;
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

	getRandomRange(e) {
		return e[0] + Math.random() * (e[1] - e[0]);
	}

	respawnSingle(ci) {
		this.phases[ci] = 0;
		this.amplitudes[ci] = 0;

		this.despawnTimeouts[ci] = this.getRandomRange(this.DESPAWN_TIMEOUT_RANGES);
		this.offsets[ci] = this.getRandomRange(this.OFFSET_RANGES);
		this.speeds[ci] = this.getRandomRange(this.SPEED_RANGES);
		this.finalAmplitudes[ci] = this.getRandomRange(this.AMPLITUDE_RANGES);
		this.widths[ci] = this.getRandomRange(this.WIDTH_RANGES);
		this.verses[ci] = this.getRandomRange([-1, 1]);
	}

	respawn() {
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

		for (let ci = 0;ci < this.noOfCurves;ci++) {
			this.respawnSingle(ci);
		}
	}

	globalAttFn(x) {
		return Math.pow(this.ATT_FACTOR / (this.ATT_FACTOR + Math.pow(x, 2)), this.ATT_FACTOR);
	}

	sin(x, phase) {
		return Math.sin(x - phase);
	}

	_grad(x, a, b) {
		if (x > a && x < b) return 1;
		return 1;
	}

	yRelativePos(i) {
		let y = 0;

		for (let ci = 0;ci < this.noOfCurves;ci++) {
			// Generate a static T so that each curve is distant from each oterh
			let t = 4 * (-1 + (ci / (this.noOfCurves - 1)) * 2);
			// but add a dynamic offset
			t += this.offsets[ci];

			const k = 1 / this.widths[ci];
			const x = i * k - t;

			y += Math.abs(
				this.amplitudes[ci] * this.sin(this.verses[ci] * x, this.phases[ci]) * this.globalAttFn(x),
			);
		}

		// Divide for NoOfCurves so that y <= 1
		return y / this.noOfCurves;
	}

	_ypos(i) {
		return (
			this.AMPLITUDE_FACTOR
			* this.midLine
			* this.ctrl.amplitude
			* this.yRelativePos(i)
			* this.globalAttFn((i / this.GRAPH_X) * 2)
		);
	}

	_xpos(i) {
		return this.ctrl.width * ((i + this.GRAPH_X) / (this.GRAPH_X * 2));
	}

	drawSupportLine(ctx, colorDef) {
		var coordinates = [this.xOffset, 0, this.width + this.xOffset, 0];
		var gradient = ctx.createLinearGradient.apply(ctx, coordinates);
		gradient.addColorStop(0, 'transparent');
		gradient.addColorStop(0.1, `rgba(${colorDef}, 1)`);
		gradient.addColorStop(0.9, `rgba(${colorDef}, 1)`);
		gradient.addColorStop(1, 'transparent');

		ctx.fillStyle = gradient;
		ctx.fillRect.apply(ctx, [this.xOffset, this.midLine, this.width, 1]);
	}

	draw() {
		const {ctx} = this.ctrl;
		//ctx.globalAlpha = 0.7;
		//ctx.globalCompositeOperation = 'lighter';
		if (this.definition.supportLine) {
			return this.drawSupportLine(ctx, this.definition.color);
		}

		for (let ci = 0;ci < this.noOfCurves;ci++) {
			if (this.spawnAt + this.despawnTimeouts[ci] <= Date.now()) {
				this.amplitudes[ci] -= this.DESPAWN_FACTOR;
			} else {
				this.amplitudes[ci] += this.DESPAWN_FACTOR;
			}

			this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finalAmplitudes[ci]);
			this.phases[ci] = (this.phases[ci] + this.ctrl.speed * this.speeds[ci] * this.SPEED_FACTOR) % (2 * Math.PI);
		}

		let maxY = -Infinity;

		// Write two opposite waves
		for (const sign of [1, -1]) {
			ctx.beginPath();

			for (let i = -this.GRAPH_X;i <= this.GRAPH_X;i += this.ctrl.opt.pixelDepth) {
				const x = this._xpos(i);
				const y = this._ypos(i);
				ctx.lineTo(x, this.midLine - sign * y);
				maxY = Math.max(maxY, y);
			}

			ctx.closePath();

			ctx.fillStyle = `rgba(${this.definition.color}, .5)`;
			ctx.strokeStyle = `rgba(${this.definition.color}, .5)`;
			ctx.fill();
		}

		if (maxY < this.DEAD_PX && this.prevMaxY > maxY) {
			this.respawn();
		}

		this.prevMaxY = maxY;

		return;
	}

	static getDefinition(waveColors) {
		return Object.assign(
			[
				{
					color: '255,255,255',
					supportLine: true,
				},
				{
					// blue
					color: '15, 82, 169',
				},
				{
					// red
					color: '173, 57, 76',
				},
				{
					// green
					color: '48, 220, 155',
				},
			],
			waveColors,
		);
	}
}

class Siriwave {
	constructor(opt = {}) {

		if(!opt.canvas) {
			throw new Error("Canvas is required");
		}

		/**
		 * Canvas DOM Element where curves will be drawn
		 */
		this.canvas = opt.canvas;


		// In this.opt you could find definitive opt with defaults values
		this.opt = Object.assign(
			{
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
				lerpSpeed: 0.1,
			},
			opt,
		);

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
		this.color = `rgb(${this.hex2rgb(this.opt.color)})`;

		/**
		 * An object containing controller variables that need to be interpolated
		 * to an another value before to be actually changed
		 */
		this.interpolation = {
			speed: this.speed,
			amplitude: this.amplitude,
		};

		/**
		 * 2D Context from Canvas
		 */
		this.ctx = this.canvas.getContext('2d');
		
		/**
		 * Curves objects to animate
		 */

		this.curves = [];

		// Instantiate all curves based on the style
		if (this.opt.style === 'ios9') {
			for (const def of iOS9Curve.getDefinition(this.opt.waveColors || [])) {
				this.curves.push(
					new iOS9Curve({
						ctrl: this,
						definition: def,
					}),
				);
			}
		} else {
			for (const def of Curve.getDefinition()) {
				this.curves.push(
					new Curve({
						ctrl: this,
						definition: def,
					}),
				);
			}
		}

		// Start the animation
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
	hex2rgb(hex) {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? `${parseInt(result[1], 16).toString()},${parseInt(result[2], 16).toString()},${parseInt(
				result[3],
				16,
			).toString()}`
			: null;
	}

	/**
	 * Interpolate a property to the value found in $.interpolation
	 * @param {String} propertyStr
	 * @returns
	 * @memberof Siriwave
	 */
	lerpProp(propertyStr) {
		this[propertyStr] = lerp(
			this[propertyStr],
			this.interpolation[propertyStr],
			this.opt.lerpSpeed,
		);
		if (this[propertyStr] - this.interpolation[propertyStr] === 0) {
			this.interpolation[propertyStr] = null;
		}
		return this[propertyStr];
	}

	/**
	 * Clear the canvas
	 * @memberof Siriwave
	 */
	_clear() {
		this.ctx.globalCompositeOperation = 'destination-out';
		this.ctx.fillRect(this.xOffset, this.yOffset, this.width, this.height);
		this.ctx.globalCompositeOperation = 'source-over';
	}

	/**
	 * Draw all curves
	 * @memberof Siriwave
	 */
	drawFrame(amplitide) {
		if (amplitide || amplitide === 0){
			this.setAmplitude(amplitide);
		}
		for (const curve of this.curves) {
			curve.draw();
		}
	}

	/**
	 * Clear the space, interpolate values, calculate new steps and draws
	 * @returns
	 * @memberof Siriwave
	 */
	startDrawCycle() {
		if (this.run === false) return;
		this._clear();

		// Interpolate values
		if (this.interpolation.amplitude !== null) this.lerpProp('amplitude');
		if (this.interpolation.speed !== null) this.lerpProp('speed');

		this.drawFrame();
		this.phase = (this.phase + (Math.PI / 2) * this.speed) % (2 * Math.PI);

		raf(this.startDrawCycle.bind(this), 20);
	}

	/* API */

	/**
	 * Start the animation
	 * @memberof Siriwave
	 */
	start() {
		this.phase = 0;
		this.run = true;
		this.startDrawCycle();
	}

	/**
	 * Stop the animation
	 * @memberof Siriwave
	 */
	stop() {
		this.phase = 0;
		this.run = false;
	}

	/**
	 * Set a new value for a property (interpolated)
	 * @param {String} propertyStr
	 * @param {Number} v
	 * @memberof Siriwave
	 */
	set(propertyStr, v) {
		this.interpolation[propertyStr] = Number(v);
	}

	/**
	 * Set a new value for the speed property (interpolated)
	 * @param {Number} v
	 * @memberof Siriwave
	 */
	setSpeed(v) {
		this.set('speed', v);
	}

	/**
	 * Set a new value for the amplitude property (interpolated)
	 * @param {Number} v
	 * @memberof Siriwave
	 */
	setAmplitude(v) {
		this.set('amplitude', v);
	}
}

exports.Siriwave = Siriwave;
