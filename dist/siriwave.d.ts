declare module siriwave {

	interface SiriwaveIOS9CurveDefinition {
		/** Color in for on 'r, g, b' string */
		rgb: [number, number, number],
		alphaStart?: number;
		alphaEnd?: number;
		throughline?: boolean;
		//Dictates the amplitude of bottom part of the wave. Select value between 0 and 1.
		mirrorFactor?: number;
		curveCountRange?: [number, number];
	}

	interface SiriwaveOptions {
		/** The canvas to draw on. */
		canvas: HTMLCanvasElement;
		/** The style of the wave: `ios` or `ios9` */
		style?: 'ios' | 'ios9';
		/** The speed of the animation. */
		speed?: number;
		/**The amplitude of the complete wave. */
		amplitude?: number;
		/**The frequency for the complete wave(how many waves). - Not available in iOS9 Style */
		frequency?: number;
		/**The color of the wave, in hexadecimal form(`#336699`, `#FF0`). - Not available in iOS9 Style */

		color?: string | null;
		/** The`canvas` covers the entire width or height of the container. */
		cover?: boolean;

		/** Position on X axis starting which Siriwave is allowed to draw */
		xOffset?: number,
		/** Position on Y axis starting which Siriwave is allowed to draw */
		yOffset?: number,
		/**Width of the canvas. */
		width?: number;
		/**Height of the canvas. */
		height?: number;
		/**Decide wether start the animation on boot. */
		autostart?: boolean;
		//** Number of step(in pixels) used when drawed on canvas. */
		resolution?: number;
		curveDefinitions?: SiriwaveIOS9CurveDefinition[]
	}
	class Siriwave {
		constructor(options: SiriwaveOptions);

		hex2rgb(hex: any): any;

		lerp(propertyStr: any): any;

		set(propertyStr: any, v: any): void;

		setAmplitude(value: number): void;

		setSpeed(value: number): void;

		start(): void;

		startDrawCycle(): void;

		drawFrame(amplitude: number): void;

		stop(): void;
	}
}

declare module 'siriwave' {
	export = siriwave
}