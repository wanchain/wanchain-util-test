var fs = require('fs');

var Web3 = require('web3');

var config = require('../config');

var web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

const contractInstanceAddress = fs.readFileSync("../PrivacyTokenBase.addr","utf8");

// todo: 返回当前的gas价格。这个值由最近几个块的gas价格的中值决定
var gasPrice = web3.eth.gasPrice;
console.log('gasPrice: ', gasPrice);

// todo: 返回当前节点持有的帐户列表
var accounts = web3.eth.accounts;
console.log('accounts: ', accounts);

// todo: 返回当前区块号
var blockNum = web3.eth.blockNumber;
console.log('blockNumber: ', blockNum);

// todo: 获得在指定区块时给定地址的余额
var balance = web3.eth.getBalance(contractInstanceAddress);
console.log('balance: ', balance);

// todo: 获得某个地址指定位置的存储的状态值。
var state = web3.eth.getStorageAt(contractInstanceAddress, 0);
console.log('getStorageAt: ', state);

// todo: 获取指定地址的代码
var code = web3.eth.getCode(contractInstanceAddress);
console.log('code', code);

//todo: 