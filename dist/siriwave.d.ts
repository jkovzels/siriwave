declare interface SiriwaveOptions {
	canvas: HTMLCanvasElement;
}
declare class Siriwave {
	constructor(options: SiriwaveOptions);

	hex2rgb(hex: any): any;

	lerp(propertyStr: any): any;

	set(propertyStr: any, v: any): void;

	setAmplitude(value: number): void;

	setSpeed(value: number): void;

	start(): void;

	startDrawCycle(): void;

	drawFrame(): void; //this method does nor exist in normal, newer package

	stop(): void;
}