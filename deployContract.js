#!/usr/bin/env node

var path = require('path');
var Web3 = require('web3');
var events = require('events');
var fs = require("fs");

var Tx = require('wanchain-util').ethereumTx;
var ethUtil = require('wanchain-util').ethereumUtil;
//ethUtil.crypto = require('crypto');

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

var fs = require('fs');
var srcDir = typeof(__dirname) === 'undefined' ? '' : __dirname;

let contractName = process.argv[2];
if(!contractName){
    contractName = "PrivacyTokenBase";
}else{
    let index = contractName.indexOf('.sol');
    if(index !== -1){
        contractName = contractName.slice(0,index);
    }
}

console.log(contractName);
var content = fs.readFileSync(path.join(srcDir, contractName+".sol"), 'utf8');

//var content = fs.readFileSync("beida.js", 'utf8');
var solc = require('solc');
var compiled = solc.compile(content, 1);
console.log(compiled);
var myTestContract = web3.eth.contract(JSON.parse(compiled.contracts[':'+contractName].interface));

console.log(compiled.contracts[':'+contractName].interface);

var config_privatekey = config.privatekey;
var config_pubkey = config.pubkey;




let globalHash = "";
	var constructorInputs = [];

	constructorInputs.push({ data: compiled.contracts[':'+contractName].bytecode});
	var txData = myTestContract.new.getData.apply(null, constructorInputs);

	//TODO: replace user's private key
	var privateKey = new Buffer(config_privatekey, 'hex');
	var amount = web3.toWei(0, 'ether');
	var bn = new web3.BigNumber(amount);
	var hexValue = '0x' + bn.toString(16);
	//TODO: replace with user address
	var serial = '0x' + web3.eth.getTransactionCount(config_pubkey).toString(16);
	var rawTx = { 
	  Txtype: '0x1',
	  nonce: serial,
	  gasPrice: '0xb88745', 
	  gasLimit: '0x2000000',
	  to: '',
	  value: hexValue,
	  from: config_pubkey,
	  data: '0x' + txData
	};
	var tx = new Tx(rawTx);
	tx.sign(privateKey);
	var serializedTx = tx.serialize();
	console.log("serializedTx:" + serializedTx.toString('hex'));
	web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), function(err, hash){
        if(!err){
            console.log('tx hash:'+hash);
            globalHash = hash;
            let filter = web3.eth.filter('latest');
            filter.watch(function(err,hash){
                if(err ){
                    console.log("err:"+err);
                }else{
                    let receipt = web3.eth.getTransactionReceipt(globalHash);
                    if(receipt){
                        filter.stopWatching();
                        console.log("contractAddress:"+receipt.contractAddress);
                        fs.writeFileSync(contractName+".addr", receipt.contractAddress);
                    }
                }
            });
        }else {
            console.log(err);
        }
	});
