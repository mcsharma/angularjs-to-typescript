#!/usr/bin/env node
var fs = require('fs');
var AngularjsToTypeScript = require('./src/ts-out/AngularjsToTypeScript');

var args = process.argv.slice(2);

var filePath = args[0];
if (!filePath || !filePath.endsWith('.js')) {
    throw new Error('Please specify a JS file!');
}

var input = fs.readFileSync(filePath, 'UTF-8');
var out = new AngularjsToTypeScript().run(input);
if (out === -1) {
    throw new Error('Error converting JS to TS');
}
fs.writeFileSync(filePath.slice(0, -3) + '.ts', out);
