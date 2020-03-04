export default class iOS9Curve {
	constructor(opt = {}) {
		this.ctx = opt.ctx;
		this.speed = opt.speed || 0.1;
		this.x = opt.x;
		this.y = opt.y;
		this.height = opt.height;
		this.width = opt.width;

		/** Represents the middle line along y-axis in the allowed for drawing bounding box */
		this.midLine = this.y + this.height / 2;

		this.definition = opt.definition;

		//** Resolution of the curve. Smaller value leads to smoother curve */
		this.resolution = opt.resolution || 0.02;

		this.GRAPH_X = 25;

		this.SPEED_FACTOR = 1;
		this.DEAD_PX = 2;
		this.ATT_FACTOR = 4;
		this.DECAY_SPEED = 0.05;

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

	respawn() {
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

		for (let i = 0;i < this.curveCount;i++) {
			this.respawnSingle(i);
		}
	}
	respawnSingle(curveIndex) {
		this.phases[curveIndex] = 1;
		this.amplitudes[curveIndex] = this.getRandom(0, 1);

		this.despawnSteps[curveIndex] = 0;//this.getRandom(0, 0); //original [500; 2000]
		//moves the ripples off center and makes it lower. [-5, 5] is about a max range 
		this.rndOffsets[curveIndex] = this.getRandom(Math.round(-4 / this.curveCount), Math.round(4 / this.curveCount)); //[-3; 3]
		this.rndSpeeds[curveIndex] = this.getRandom(0.5, 1); //[0.5; 1]
		this.finalAmplitudes[curveIndex] = this.getRandom(0.3, 1); //origin: [0.3; 1]
		this.rndWidths[curveIndex] = this.getRandom(1, 6);  //[1; 3]
		//keep it 0 to have one symmetrical curves.
		//With curveCount set to 1 non-zero value will produce symetrical ripples within the curve
		this.ripples[curveIndex] = 0;//this.getRandom(0, 0); //original: [-1, 1]  
	}

	bellFunc(x) {
		return Math.pow(this.ATT_FACTOR / (this.ATT_FACTOR + Math.pow(x, 2)), this.ATT_FACTOR);
	}

	yRelativePos(xPos) {
		let y = 0;
		for (let ci = 0;ci < this.curveCount;ci++) {
			const cc = this.curveCount;
			let offset = (ci - (cc - 1) / 2) * cc;
			//add dynamic random offset
			offset += this.rndOffsets[ci];

			//rWidth defines the speed of change on the bell function 
			const rWidth = 1 / this.rndWidths[ci];
			const x = xPos * rWidth - offset;
			let z = this.bellFunc(x);
			let a = this.amplitudes[ci];

			//ignore this for now
			let p = this.ripples[ci] * x - this.phases[ci];
			let sin = Math.sin(p);

			y += Math.abs(a * z * sin);
		}
		return y / this.curveCount;
	}

	ypos(pos) {
		return (
			this.height
			* this.yRelativePos(pos)
			* this.bellFunc((pos / this.GRAPH_X) * 2)
		);
	}

	xpos(i) {
		return this.width * ((i + this.GRAPH_X) / (this.GRAPH_X * 2)) + this.x;
	}


	draw(amplitude) {
		const ctx = this.ctx;
		if (this.definition.throughline) {
			this.drawThroughline(ctx, this.definition);
			return;
		}

		let xAtMaxY = this.width / 2 + this.x;
		let maxY = -Infinity;

		let Y = [];
		let X = [];

		//it itterates over [-25;25] range with looks very artificial
		for (let i = -this.GRAPH_X;i <= this.GRAPH_X;i += this.resolution) {
			let x = this.xpos(i);
			X.push(x);
			let y = this.ypos(i) * amplitude;
			if (maxY < y) {
				maxY = y;
				xAtMaxY = x;
			}
			Y.push(y);
		}

		const yMax = this.height / 2;
		// //avoid clipping
		if (maxY > yMax) {
			for (let i = 0;i < Y.length;i++) {
				Y[i] = Y[i] / maxY * yMax;
			}
			maxY = yMax;
		}
		ctx.beginPath();
		ctx.moveTo(X[0], this.midLine);
		for (let i = 0;i < Y.length;i++) {
			ctx.lineTo(X[i], this.midLine - (Y[i]));
		}

		//draw mirror wave under the middline.
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
		} else {
			this.prevMaxY = maxY;
			let ampDelta = Math.abs(this.masterAmplitude - amplitude);
			if (ampDelta < amplitude * 0.1) { //if value of amp in 2 concequent frames is less then 10% we consider it noise and despawning the wave;
				this.despawn();
			}
		}
		this.masterAmplitude = amplitude;
	}

	/** Change amplitude and phase depending on the current tick and random factor */
	despawn() {
		this.step++;
		for (let ci = 0;ci < this.curveCount;ci++) {
			this.amplitudes[ci] -= this.DECAY_SPEED;

			this.amplitudes[ci] = Math.min(Math.max(this.amplitudes[ci], 0), this.finalAmplitudes[ci]);
			this.phases[ci] = (this.phases[ci] + this.speed * this.rndSpeeds[ci] * this.SPEED_FACTOR) % (2 * Math.PI);
		}
	}

	drawThroughline(ctx, definition) {
		var coordinates = [this.x, 0, this.width + this.x, 0];
		var gradient = ctx.createLinearGradient.apply(ctx, coordinates);
		gradient.addColorStop(0, 'transparent');
		gradient.addColorStop(0.1, `rgba(${definition.rgb.join()}, ${definition.alphaStart}})`);
		gradient.addColorStop(0.9, `rgba(${definition.rgb}, ${definition.alphaStart})`);
		gradient.addColorStop(1, 'transparent');

		ctx.fillStyle = gradient;
		ctx.fillRect.apply(ctx, [this.x, this.midLine, this.width, 1]);
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