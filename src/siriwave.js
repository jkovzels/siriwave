import raf from 'raf';

//import Curve from './curve'; commenting for now, not using
import iOS9Curve from './ios9curve';

export class Siriwave {
	constructor(opt = {}) {

		if (!opt.canvas) {
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
				resolution: 0.02
			},
			opt,
		);

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
		this.width = Number(this.opt.width);

		/**
		 * Height of the canvas multiplied by pixel ratio
		 */
		this.height = Number(this.opt.height);

		/**
		 * Color of the wave (used in Classic iOS)
		 */
		this.color = `rgb(${this.hex2rgb(this.opt.color)})`;


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
			let definitions = iOS9Curve.getDefinitions(this.opt.curveDefinitions);
			for (const definition of definitions) {
				this.curves.push(
					new iOS9Curve({
						ctx: this.ctx,
						definition: definition,
						speed: opt.speed,
						resolution: opt.resolution,
						xOffset: opt.xOffset,
						yOffset: opt.yOffset,
						height: opt.height,
						width: opt.width
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
	 * Clear the canvas
	 * @memberof Siriwave
	 */
	clear() {
		this.ctx.fillStyle = this.color;
		this.ctx.fillRect(this.xOffset, this.yOffset, this.width, this.height);

		//leave for debugging
		//this.ctx.strokeStyle = '#FFF';
		//this.ctx.strokeRect(this.xOffset, this.yOffset, this.width, this.height);
	}

	/**
	 * Draw all curves
	 * @memberof Siriwave
	 */
	drawFrame(amplitide = 0) {
		this.clear();
		for (const curve of this.curves) {
			curve.draw(amplitide);
		}
	}

	/**
	 * Clear the space, \calculate new steps and draws
	 * @returns
	 * @memberof Siriwave
	 */
	startDrawCycle() {
		if (this.run === false) return;
		this.drawFrame(1);

		raf(this.startDrawCycle.bind(this));
	}

	/* API */

	/**
	 * Start the animation
	 * @memberof Siriwave
	 */
	start() {
		this.run = true;
		this.startDrawCycle();
	}

	/**
	 * Stop the animation
	 * @memberof Siriwave
	 */
	stop() {
		this.run = false;
	}
}