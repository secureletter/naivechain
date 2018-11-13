'use strict';
const log = require('loglevel');
var App = require("./app.js");

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

log.enableAll();
log.setDefaultLevel("debug");

var app = new App(http_port, p2p_port, initialPeers);
app.start();