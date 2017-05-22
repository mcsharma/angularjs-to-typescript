#!/usr/bin/env node
var fs = require('fs');
var BlinkJS2TS = require('./src/ts-out/BlinkJS2TS');

var args = process.argv.slice(2);

var filePath = args[0];
if (!filePath || !filePath.endsWith('.js')) {
    throw new Error('Please specify a JS file!');
}

let input = fs.readFileSync(filePath, 'UTF-8');
let output = new BlinkJS2TS().run(input);

fs.writeFileSync(filePath.slice(0, -3) + '.ts', output, 'UTF-8');
