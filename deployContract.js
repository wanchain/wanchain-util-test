#!/usr/bin/env node

var path = require('path');
var Web3 = require('web3');
var events = require('events');
var fs = require("fs");

var Tx = require('wanchain-util').ethereumTx;
var ethUtil = require('wanchain-util').ethereumUtil;
//ethUtil.crypto = require('crypto');

var config = require('./config');
var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));

var srcDir = typeof(__dirname) == 'undefined' ? '' : __dirname;

let contractName = process.argv[2];
if(!contractName){
    contractName = "PrivacyTokenBase";
}else{
    let index = contractName.indexOf('.sol');
    if(index != -1){
        contractName = contractName.slice(0,index);
    }
}

console.log(contractName);
var content = fs.readFileSync(path.join(srcDir + '/sol/', contractName+".sol"), 'utf8');

//var content = fs.readFileSync("beida.js", 'utf8');
var solc = require('solc');
var compiled = solc.compile(content, 1);
console.log(compiled);
var myTestContract = web3.eth.contract(JSON.parse(compiled.contracts[':'+contractName].interface));

console.log(compiled.contracts[':'+contractName].interface);

var config_privatekey = 'a4369e77024c2ade4994a9345af5c47598c7cfb36c65e8a4a3117519883d9014';
var config_pubkey = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';




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
	  gasLimit: '0x90000',
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
            let filter = web3.eth.filter('latest');
            filter.watch(function(err,hash){
                if(err ){
                    console.log("err:"+err);
                }else{
                    let receipt = web3.eth.getTransactionReceipt(hash);
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

