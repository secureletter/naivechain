const log = require('loglevel');
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

var BlockChain = require("./blockchain.js");
var { MessageType } = require("./common.js");

class App {
	constructor(http_port, p2p_port, initialPeers) {
		this.http_port = http_port;
		this.p2p_port = p2p_port;
		this.initialPeers = initialPeers;

		this.sockets = [];
		this.blockchain = null;
		this.http_server = null;
		this.p2p_server = null;
	}

	start() {
		this.blockchain = new BlockChain();
		this.http_server = this.initHttpServer();
		this.p2p_server = this.initP2PServer();
	}

	// API 서버 생성 
	initHttpServer() {
		var app = express();
		app.use(bodyParser.json());
		// return blockchain list
		app.get('/blocks', (req, res) => {
			var chain = this.blockchain.chain;
			res.send(JSON.stringify(chain));
		});
		// create block
		app.post('/mineBlock', (req, res) => {
			// 새로운 블록 생성 
			var newBlock = this.blockchain.mineBlock(req.body.data);
			var msg = this.responseLatestMsg();
			// 새로운 블록을 브로드케이팅 
			this.broadcast(msg);
			log.info('[BLOCK-ADD] ' + JSON.stringify(newBlock));
			res.send(JSON.stringify(newBlock));
		});
		app.get('/peers', (req, res) => {
			res.send(this.getSocketLog());
		});
		app.post('/addPeer', (req, res) => {
			this.connectToPeer(req.body.peer);
			res.send(this.getSocketLog());
		});
		app.listen(this.http_port, () => log.info('Listening http on port: ' + this.http_port));
		return app;
	};

	getSocketLog() {
		return this.sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort);
	}

	// 소켓서버 생성 
	initP2PServer() {
		var server = new WebSocket.Server({ port: this.p2p_port });
		server.on('connection', ws => this.initConnection(1, ws));
		log.info('listening websocket p2p port on: ' + this.p2p_port);
		return server;
	};

	connectToPeer(peer) {
		var ws = new WebSocket(peer);
		ws.on('open', () => this.initConnection(2, ws));
		ws.on('error', () => {
			log.info("[" + ws._socket.remoteAddress + "] connection failed");
		});
	};

	initConnection(type, ws) {
		log.info("type " + type);
		this.sockets.push(ws);
		this.initHandler(ws);
		this.write(ws, this.queryChainLengthMsg());
		log.info("clients : ", this.getSocketLog());
	};

	initHandler(ws) {
		ws.on('message', (data) => {
			var message = JSON.parse(data);
			log.info("[" + ws._socket.remoteAddress + "] Received message" + JSON.stringify(message));
			switch (message.type) {
				case MessageType.QUERY_LATEST:
					this.write(ws, this.responseLatestMsg());
					break;
				case MessageType.QUERY_ALL:
					this.write(ws, this.responseChainMsg());
					break;
					// 블록이 추가됐을떄 					
				case MessageType.RESPONSE_BLOCKCHAIN:
					this.handleBlockchainResponse(message);
					break;
			}
		});
		var closeConnection = (ws) => {
			log.info("[" + ws._socket.remoteAddress + "] connection failed to peer: " + ws.url);
			this.sockets.splice(this.sockets.indexOf(ws), 1);
		};
		ws.on('close', () => closeConnection(ws));
		ws.on('error', () => closeConnection(ws));
	};

	handleBlockchainResponse(message) {
		var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
		var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
		var latestBlockHeld = this.blockchain.getLatestBlock();
		if (latestBlockReceived.index > latestBlockHeld.index) {
			log.info('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
			if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
				log.info("We can append the received block to our chain");
				this.blockchain.push(latestBlockReceived);
				this.broadcast(this.responseLatestMsg());
			} else if (receivedBlocks.length === 1) {
				log.info("We have to query the chain from our peer");
				this.broadcast(this.queryAllMsg());
			} else {
				log.info("Received blockchain is longer than current blockchain");
				this.blockchain.replaceChain(receivedBlocks);
				this.broadcast(this.responseLatestMsg());
			}
		} else {
			log.info('received blockchain is not longer than current blockchain. Do nothing');
		}
	};

	responseLatestMsg() {
		return {
			'type': MessageType.RESPONSE_BLOCKCHAIN,
			'data': JSON.stringify([this.blockchain.getLatestBlock()])
		}
	};

	responseChainMsg() {
		return {
			'type': MessageType.RESPONSE_BLOCKCHAIN,
			'data': JSON.stringify(this.blockchain.chain)
		}
	};

	queryChainLengthMsg() {
		return { 'type': MessageType.QUERY_LATEST };
	}

	queryAllMsg() {
		return { 'type': MessageType.QUERY_ALL }
	}

	broadcast(message) {
		this.sockets.forEach(socket => this.write(socket, message));
	}

	write(ws, message) {
		ws.send(JSON.stringify(message));
	}
}

module.exports = App;