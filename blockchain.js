'use strict';
const log = require('loglevel');
var CryptoJS = require("crypto-js");

var Block = require("./block.js");
var { MessageType } = require("./common.js");

class BlockChain {
	constructor() {
		this.chain = [this.getGenesisBlock()];
	}

	// genesis 블록 생성 
	getGenesisBlock() {
		return new Block(0, "0", 1465154705, "my genesis block!!", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
	}

	// 새로운 블록체인으로 교체
	replaceChain(newBlocks) {
		if (this.isValidChain(newBlocks) && newBlocks.length > this.chain.length) {
			log.info('Received blockchain is valid. Replacing current blockchain with received blockchain');
			this.chain = newBlocks;
			return true;
		} else {
			log.info('Received blockchain invalid');
			return false;
		}
	};

	isValidChain(blockchainToValidate) {
		if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(this.getGenesisBlock())) {
			return false;
		}
		var tempBlocks = [blockchainToValidate[0]];
		for (var i = 1; i < blockchainToValidate.length; i++) {
			if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
				tempBlocks.push(blockchainToValidate[i]);
			} else {
				return false;
			}
		}
		return true;
	}

	mineBlock(blockData) {
		var newBlock = this.generateNextBlock(blockData);
		if (this.addBlock(newBlock) == true) {
			return newBlock;
		} else {
			return null;
		}
	}

	generateNextBlock(blockData) {
		var previousBlock = this.getLatestBlock();
		var nextIndex = previousBlock.index + 1;
		var nextTimestamp = new Date().getTime() / 1000;
		// 새로운 해시 생성  (index + prev Hash + timestamp + data)
		var nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
		// 새로운 블록 생성후 리턴
		return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
	};

	calculateHashForBlock(block) {
		return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data);
	};

	calculateHash(index, previousHash, timestamp, data) {
		return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
	};

	addBlock(newBlock) {
		// 새로운 블록의 유효성 검사후 OK면 chain에 추가 		
		if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
			this.chain.push(newBlock);
			return true;
		} else {
			return false;
		}
	};

	isValidNewBlock(newBlock, previousBlock) {
		// index 확인 
		if (previousBlock.index + 1 !== newBlock.index) {
			log.info('[valid block] invalid index');
			return false;
			// prev hash 확인 			
		} else if (previousBlock.hash !== newBlock.previousHash) {
			log.info('valid block] invalid previoushash');
			return false;
			// hash 확인 			
		} else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
			log.info(typeof(newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
			log.info('[valid block] invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
			return false;
		}
		return true;
	};

	getLatestBlock() {
		return this.chain[this.chain.length - 1];
	};
}

module.exports = BlockChain;