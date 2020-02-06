export default class iOS9Curve {
	constructor(opt = {}) {
		this.controller = opt.ctrl;
		this.speed = opt.speed;
		this.xOffset = opt.ctrl.xOffset;
		this.yOffset = opt.ctrl.yOffset;
		this.height = opt.ctrl.height;
		this.width = opt.ctrl.width;

		/** Represents the middle line along y-axis in the allowed for drawing bounding box */
		this.midLine = this.yOffset + this.height / 2;

		this.definition = opt.definition;

		//** Resolution of the curve. Smaller value leads to smoother curve */
		this.resolution = opt.resolution;

		this.GRAPH_X = 25;

		this.SPEED_FACTOR = 1;
		this.DEAD_PX = 2;
		this.ATT_FACTOR = 4;
		this.DESPAWN_FACTOR = 0.02;

		this.respawn();
	}

	getRandom(minOrArray, max) {
		let min = 0;
		if (Array.isArray(minOrArray)) {
			min = minOrArray[0];
			max = minOrArray[1];
		} else {
			min = minOrArray;
		}
		return Math.random() * (max - min) + min;
	}

	getRandomInt(minOrArray, max) {
		let min = 0;
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


	respawnSingle(rippleIndex) {
		this.phases[rippleIndex] = 0;
		this.amplitudes[rippleIndex] = 0;

		this.despawnTimeouts[rippleIndex] = this.getRandom(500, 2000); //original [500; 2000]
		//moves the riples off center and makes it lower. [-5, 5] is about a max range 
		this.offsets[rippleIndex] = this.getRandom(Math.round(-12 / this.curveCount), Math.round(12 / this.curveCount)); //[-3; 3]
		this.speeds[rippleIndex] = this.getRandom(0.5, 1); //[0.5; 1]
		this.finalAmplitudes[rippleIndex] = this.getRandom(0.3, 1); //origin: [0.3; 1]
		this.widths[rippleIndex] = this.getRandom(1, 4);  //[1; 3]
		//keep it 0 to have one symmetrical curves. With curveCount set to 1 non-zero value will produce symetrical ripples within the curve
		this.ripples[rippleIndex] = this.getRandom(0, 0); //original: [-1, 1]  
	}

	respawn() {
		this.spawnAt = Date.now();
		/**
		 * Number of curves produced by the wave along y-axis
		 */
		this.curveCount = this.getRandomInt(this.definition.curveCountRange); //original: [2, 5]

		this.phases = new Array(this.curveCount);
		this.offsets = new Array(this.curveCount);
		this.speeds = new Array(this.curveCount);
		this.finalAmplitudes = new Array(this.curveCount);
		this.widths = new Array(this.curveCount);
		this.amplitudes = new Array(this.curveCount);
		this.despawnTimeouts = new Array(this.curveCount);
		this.ripples = new Array(this.curveCount);

		for (let i = 0;i < this.curveCount;i++) {
			this.respawnSingle(i);
		}
	}

	globalAttFn(x) {
		return Math.pow(this.ATT_FACTOR / (this.ATT_FACTOR + Math.pow(x, 2)), this.ATT_FACTOR);
	}

	yRelativePos(xPos) {
		let y = 0;

		for (let curveIndex = 0;curveIndex < this.curveCount;curveIndex++) {
			let t = this.curveCount == 1 ? 2 : 4 * (-1 + (curveIndex / (this.curveCount - 1)) * 2);

			// but add a dynamic offset
			t += this.offsets[curveIndex];
			const k = 1 / this.widths[curveIndex];
			const x = xPos * k - t;
			y += Math.abs(
				this.amplitudes[curveIndex] * Math.sin(this.ripples[curveIndex] * x - this.phases[curveIndex]) * this.globalAttFn(x)
			);
		}
		// Divide for number of ripples so that y <= 1
		return y / this.curveCount;
	}

	ypos(pos) {
		return (
			this.height // multiplying by height will likely lead to clipping we will deal with that later
			* this.controller.amplitude
			* this.yRelativePos(pos)
			* this.globalAttFn((pos / this.GRAPH_X) * 2)
		);
	}

	xpos(i) {
		return this.width * ((i + this.GRAPH_X) / (this.GRAPH_X * 2)) + this.xOffset;
	}

	draw() {
		const {ctx} = this.controller;
		if (this.definition.throughline) {
			this.drawThroughline(ctx, this.definition);
			return;
		}
		this.spawnDespawn();


		let minX = +Infinity;
		let xAtMaxY = this.width / 2 + this.xOffset;
		let maxY = -Infinity;


		// Write two opposite waves

		let Y = [];
		let X = [];

		//it itterates over [-25;25] range with looks very artificial
		for (let i = -this.GRAPH_X;i <= this.GRAPH_X;i += this.resolution) {
			let x = this.xpos(i);
			X.push(x);
			let y = this.ypos(i);
			if (maxY < y) {
				maxY = y;
				xAtMaxY = x;
			}
			Y.push(y);
		}

		const yMax = this.height / 2;
		//avoid clipping
		if (maxY > yMax) {
			for (let i = 0;i < Y.length;i++) {
				Y[i] = Y[i] / yMax;
			}
			maxY = maxY / yMax;
		}
		ctx.beginPath();
		ctx.moveTo(X[0], this.midLine);
		for (let i = 0;i < Y.length;i++) {
			ctx.lineTo(X[i], this.midLine - (Y[i]));
		}

		//draw mirrir wave under the middline.
		for (let i = Y.length - 1;i >= 0;i--) {
			ctx.lineTo(X[i], this.midLine + (Y[i]) * this.definition.mirrorFactor);
		}
		ctx.closePath();

		const x = xAtMaxY;
		const y = this.midLine;
		const r = maxY;
		var gradient = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 0.4);
		gradient.addColorStop(0, `rgba(${this.definition.rgb.join()}, ${this.definition.alphaStart})`);
		gradient.addColorStop(1, `rgba(${this.definition.rgb.join()}, ${this.definition.alphaEnd})`);

		ctx.fillStyle = gradient;
		ctx.fill();

		if (maxY < this.DEAD_PX && this.prevMaxY > maxY) {
			this.respawn();
		}
		this.prevMaxY = maxY;
	}

	/** Change amplitude and phase depending on the time */
	spawnDespawn() {
		for (let ci = 0;ci < this.curveCount;ci++) {
			if (this.spawnAt + this.despawnTimeouts[ci] <= Date.now()) {
				this.amplitudes[ci] -= this.DESPAWN_FACTOR;
			}
			else {
				this.amplitudes[ci] += this.DESPAWN_FACTOR;
			}
			this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finalAmplitudes[ci]);
			this.phases[ci] = (this.phases[ci] + this.controller.speed * this.speeds[ci] * this.SPEED_FACTOR) % (2 * Math.PI);
		}
	}

	drawThroughline(ctx, definition) {
		var coordinates = [this.xOffset, 0, this.width + this.xOffset, 0];
		var gradient = ctx.createLinearGradient.apply(ctx, coordinates);
		gradient.addColorStop(0, 'transparent');
		gradient.addColorStop(0.1, `rgba(${definition.rgb.join()}, ${definition.alphaStart}})`);
		gradient.addColorStop(0.9, `rgba(${definition.rgb}, ${definition.alphaStart})`);
		gradient.addColorStop(1, 'transparent');

		ctx.fillStyle = gradient;
		ctx.fillRect.apply(ctx, [this.xOffset, this.midLine, this.width, 1]);
	}

	static getDefinitions(definitions) {

		if (!definitions || definitions.length == 0) {
			return [ //defaults
				{
					rgb: '255,255,255',
					alphaStart: 1,
					alphaEnd: 1,
					throughline: true,
				},
				{
					// blue
					rgb: [15, 82, 169],
					alphaStart: .5,
					alphaEnd: .2,
				},
				{
					// red
					rgb: [173, 57, 76],
					alphaStart: .5,
					alphaEnd: .2,
				},
				{
					// green
					color: [48, 220, 155],
					alphaStart: .5,
					alphaEnd: .2,

				},
			]
		}
		//assign default 
		for (let i = 0;i < definitions.length;i++) {
			let definition = definitions[i];
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
}