"use strict";
const http = require('http');
var async = require('async');
const method = 'GET';

const num = 1000;
const concurrency = 100;

const keepAliveAgent = new http.Agent({ keepAlive: true });

const benchmarks = [];

function request(n, cb) {
    const path = '/benchmark?len=256k';
    const options = {
        method,
        path,
        headers: { 'content-length': 0 },
        host: '127.0.0.1',
        port: 9000,
        agent: keepAliveAgent
    };
    const req = http.request(options);
    const ret = [];
    var stats = {
        'req#': n
    };
    const start = process.hrtime();
    req.on('socket', (socket) => {
        const end = process.hrtime(start);
        const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
        stats['socket'] = elapsed_ms;
        /* to avoid "warning: possible EventEmitter memory leak detected. */
        socket.setMaxListeners(0);
        socket.on('connect', () => {
    	       const end = process.hrtime(start);
               const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
               stats['connect'] = elapsed_ms;
        });

        socket.on('lookup', () => {
            const end = process.hrtime(start);
            const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
            stats['dns'] = elapsed_ms;
        });

        socket.setNoDelay(true);
    }).on('response', (res) => {
        const end = process.hrtime(start);
        const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
        stats['response'] = elapsed_ms;
        stats['data'] = [];
        const contentLen = parseInt(res.headers['content-length'], 10);
        let resLen = 0;
        res.on('data', (data) => {
            const end = process.hrtime(start);
            const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
            resLen += data.length;
            stats['data'].push(elapsed_ms);
        }).on('end', () => {
            stats['contentMismatch'] = false;
            if(contentLen !== resLen) {
                stats['contentMismatch'] = true;
            }
            const end = process.hrtime(start);
            const elapsed_ms = end[0] * 1000 + end[1] / 1000000;
            stats['end'] = elapsed_ms;
            benchmarks.push(stats);
            cb();
        });
    }).end();
}

async.timesLimit(num, concurrency, request, function(err, res) {
    benchmarks.sort((a, b) => { return a['req#'] - b['req#']; });
    console.log(benchmarks)
});
