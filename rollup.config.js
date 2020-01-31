import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';
import livereload from 'rollup-plugin-livereload';
import serve from 'rollup-plugin-serve';
import copy from 'rollup-plugin-copy';

import pkg from './package.json';


const copySetup = copy({targets: [{src: 'src/siriwave.d.ts', dest: 'dist'}], verbose: true})

const additional_plugins = [];

if (process.env.NODE_ENV !== 'production') {
	additional_plugins.push(
		serve({
			open: true,
			contentBase: '.'
		})
	);
	 additional_plugins.push(
	 	livereload({
	 		watch: 'dist'
	 	})
	 );
}

export default [{
		input: 'src/siriwave.js',
		output: {
			file: pkg.unpkg,
			name: pkg.amdName,
			format: 'umd'
		},
		plugins: [
			resolve(),
			commonjs(),
			copySetup,
			babel({
				exclude: 'node_modules/**'
			}),
		].concat(additional_plugins)
	},
	{
		input: 'src/siriwave.js',
		output: {
			file: pkg.main,
			format: 'cjs'
		},
		plugins: [
			commonjs(),
			copySetup
		]
	},
	{
		input: 'src/siriwave.js',
		output: {
			file: pkg.unpkg.replace('.js', '.min.js'),
			name: pkg.amdName,
			format: 'umd'
		},
		plugins: [
			resolve(),
			commonjs(),
			copySetup,
			babel({
				exclude: 'node_modules/**'
			}),
			uglify()
		].concat(additional_plugins)
	},
	{
		input: 'src/siriwave.js',
		output: [{
			file: pkg.module,
			format: 'esm'
		}],
		plugins: [
			copySetup,
			babel({
				exclude: 'node_modules/**'
			}),
		]
	}
];