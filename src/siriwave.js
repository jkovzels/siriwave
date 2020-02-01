import raf from 'raf';
import lerp from 'lerp';
//import Curve from './curve'; commenting for now, not using
import iOS9Curve from './ios9curve';

export class Siriwave {
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
						pixelDepth: this.opt.pixelDepth
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
