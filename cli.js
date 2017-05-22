#!/usr/bin/env node
var fs = require('fs');
var AngularjsToTypeScript = require('./src/ts-out/AngularjsToTypeScript');

var args = process.argv.slice(2);

var filePath = args[0];
if (!filePath || !filePath.endsWith('.js')) {
    throw new Error('Please specify a JS file!');
}

// files = [    'app/src/modules/viz-layout/viz/chart/highcharts/blink-highchart-config.js'];
// var failed = 0, unsupported = 0, passed = 0;
// files.forEach((file, index) => {
//     if (!file.endsWith('.js')) return;
//     var path = '/Users/mahesh/thoughtspot/blink/' + file;
//     var input = fs.readFileSync(path, 'UTF-8');
//     try {
//         var out = new AngularjsToTypeScript().run(input);
//         if (out == -1) {
//             unsupported++;
//         } else {
//             passed++;
//         }
//     } catch (e) {
//         console.log(e.message);
//         failed++;
//     }
// });

// console.log(passed, unsupported, failed);


var input = fs.readFileSync(filePath, 'UTF-8');
var out = new AngularjsToTypeScript().run(input);

fs.writeFileSync(filePath.slice(0, -3) + '.ts', out);
