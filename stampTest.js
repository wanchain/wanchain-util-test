/*
     Testing interface of privacy protected contract
     TODO: add sendOTATransaction for ethereumjs-util
*/
var fs = require('fs');
var path = require('path');
var Web3 = require('web3');
var events = require('events');

var Tx = require('wanchain-util').ethereumTx;
var ethUtil = require('wanchain-util').ethereumutil;
var solc = require('solc');

var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var srcDir = typeof(__dirname) == 'undefined' ? '' : __dirname;
var content = fs.readFileSync(path.join(srcDir + '/sol/', "WanchainStamps.sol"), 'utf8');

var compiled = solc.compile(content, 1);
var privacyContract = web3.eth.contract(JSON.parse(compiled.contracts[':WanchainStamps'].interface));
//next line can used in cli debug
//var privacyContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"initialBase","type":"address"},{"name":"baseKeyBytes","type":"bytes"},{"name":"value","type":"uint256"}],"name":"initAsset","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"tfrom","type":"address"},{"name":"tto","type":"address"},{"name":"keyBytes","type":"bytes"},{"name":"_value","type":"uint256"},{"name":"sigv","type":"uint8"},{"name":"sigr","type":"bytes32"},{"name":"sigs","type":"bytes32"}],"name":"privacyTransfer","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"setAddress","type":"address"},{"name":"value","type":"uint256"}],"name":"directDeposit","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"tfrom","type":"address"},{"name":"tto","type":"address"},{"name":"keyBytes","type":"bytes"},{"name":"_value","type":"uint256"}],"name":"signBytes","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"tfrom","type":"address"},{"name":"tto","type":"address"},{"name":"keyBytes","type":"bytes"},{"name":"value","type":"uint256"},{"name":"sigv","type":"uint8"},{"name":"sigr","type":"bytes32"},{"name":"sigs","type":"bytes32"}],"name":"sigCheck","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"hash","type":"bytes32"},{"name":"sigv","type":"uint8"},{"name":"sigr","type":"bytes32"},{"name":"sigs","type":"bytes32"}],"name":"sigCheckByHash","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"v","type":"uint256"}],"name":"uintToBytes","outputs":[{"name":"ret","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"mInitialized","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"tfrom","type":"address"},{"name":"tto","type":"address"},{"name":"value","type":"uint256"}],"name":"tranferDirect","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"keyOf","outputs":[{"name":"","type":"bytes"}],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"}]);
var contractInstanceAddress = fs.readFileSync("WanchainStamps.addr","utf8");
var contractInstance = privacyContract.at(contractInstanceAddress);

var config_privatekey = 'a4369e77024c2ade4994a9345af5c47598c7cfb36c65e8a4a3117519883d9014';
var config_address = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';

let stampType = {
    TypeOne:0,
    TypeTwo:1,
    TypeFour:2,
    TypeEight:3,
    TypeSixteen:4
}



function getTransactionReceipt(txHash)
{
    return new Promise(function(success,fail){
        let filter = web3.eth.filter('latest');
        let blockAfter = 0;
        filter.watch(function(err,blockhash){
            if(err ){
                console.log("err:"+err);
            }else{
                let receipt = web3.eth.getTransactionReceipt(txHash);
                blockAfter += 1;
                if(receipt){
                    filter.stopWatching();
                    success(receipt);
                    return receipt;
                }else if(blockAfter > 6){
                    fail("Get receipt timeout");
				}
            }
        });
    });
}

function caculateValue(type, instance){
    let value = 0;
    if(type == stampType.TypeOne){
        value = 1 *instance.stampPrice.call();
    }else if(type == stampType.TypeTwo) {
        value = 2 *instance.stampPrice.call();
    }else if(type == stampType.TypeFour) {
        value = 4 *instance.stampPrice.call();
    }else if(type == stampType.TypeEight) {
        value = 8 *instance.stampPrice.call();
    }else if(type == stampType.TypeSixteen) {
        value = 16 *instance.stampPrice.call();
    }else{
        value = 0;
    }
    return value;
}


async function i_buyWanchainStamp(type, otaAddress,  otaKeyBytes){

    var privateKey = new Buffer(config_privatekey, 'hex');
    var serial = '0x' + web3.eth.getTransactionCount(config_address).toString(16);
    let payload = contractInstance.buyStamp.getData(type, otaAddress,otaKeyBytes);
    let stampValue = caculateValue(type, contractInstance);
    console.log("stampValue: "+stampValue);
    let hsValue = '0x'+stampValue.toString(16);
    var rawTx = {
        Txtype: '0x01',
        nonce: serial,
        gasPrice: '0x88745',
        gasLimit: '0x1000000',
        to: contractInstanceAddress,//contract address
        value: hsValue,
        data: payload
    };
    console.log("payload: " + rawTx.data);
    console.log("value: " + hsValue);

    var tx = new Tx(rawTx);
    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);
    try {
        let receipt = await getTransactionReceipt(hash);
        console.log(receipt);
        console.log("otaKeyBytes is "+otaKeyBytes);
        if(type == stampType.TypeOne){
            console.log("stamp type "+type+" total: "+contractInstance.StampCountOne.call());
            console.log(otaAddress +" has stamp type "+type +" keyBytes "+contractInstance.StampListOne(otaAddress));
        }else if(type == stampType.TypeTwo) {
            console.log("stamp type "+type+" total: "+contractInstance.StampCountTwo.call());
            console.log(otaAddress +" has stamp type "+type +" keyBytes "+contractInstance.StampListTwo(otaAddress));
        }else if(type == stampType.TypeFour) {
            console.log("stamp type "+type+" total: "+contractInstance.StampCountFour.call());
            console.log(otaAddress +" has stamp type "+type +" keyBytes "+contractInstance.StampListFour(otaAddress));
        }else if(type == stampType.TypeEight) {
            console.log("stamp type "+type+" total: "+contractInstance.StampCountEight.call());
            console.log(otaAddress +" has stamp type "+type +" keyBytes "+contractInstance.StampListEight(otaAddress));
        }else if(type == stampType.TypeSixteen) {
            console.log("stamp type "+type+" total: "+contractInstance.StampCountSixteen.call());
            console.log(otaAddress +" has stamp type "+type +" keyBytes "+contractInstance.StampListSixteen(otaAddress));
        }
    }catch(e){
        console.log(e);
    }
}

async function i_setStampPrice(price){

    var privateKey = new Buffer(config_privatekey, 'hex');
    var serial = '0x' + web3.eth.getTransactionCount(config_address).toString(16);
    let payload = contractInstance.setStampPrice.getData(price);
    var rawTx = {
        Txtype: '0x01',
        nonce: serial,
        gasPrice: '0x88745',
        gasLimit: '0x1000000',
        to: contractInstanceAddress,//contract address
        value: "0x00",
        data: payload
    };
    console.log("payload: " + rawTx.data);

    var tx = new Tx(rawTx);
    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);
    try {
        let receipt = await getTransactionReceipt(hash);
        console.log(receipt);
        console.log("stamp price is : "+contractInstance.stampPrice.call());
    }catch(e){
        console.log(e);
    }
}

function stampGetCountByType(type){
    let count = 0;
    if(type == stampType.TypeOne){
        count = contractInstance.StampCountOne.call();
    }else if(type == stampType.TypeTwo) {
        count = contractInstance.StampCountTwo.call();
    }else if(type == stampType.TypeFour) {
        count = contractInstance.StampCountFour.call();
    }else if(type == stampType.TypeEight) {
        count = contractInstance.StampCountEight.call();
    }else if(type == stampType.TypeSixteen) {
        count = contractInstance.StampCountSixteen.call();
    }else{
        count = 0;
    }
    return count;
}
async function main(){

    /*
        1. generate a one time Key and compute corresponding private key
    */
    var pubkeyStr = ethUtil.publicKeyFromPrivateKey(config_privatekey);

    await i_setStampPrice(2000);
    let type = stampType.TypeFour;
    for(let i=0; i<7; i++){
        var ota = ethUtil.generateOTAPublicKey(pubkeyStr, pubkeyStr);
        var otaAddress = ethUtil.bufferToHex(ethUtil.publicToAddress('0x' + ota.OtaA1));
        var otaKeyBytesCompressed = ethUtil.pubkeyStrCompressed(ota.OtaA1) + ethUtil.pubkeyStrCompressed(ota.OtaS1).slice(2);
        await i_buyWanchainStamp(type, otaAddress, otaKeyBytesCompressed);
    }

    let countType = stampGetCountByType(type);
    console.log("Stamp of type "+type+" total "+countType);
    let index = Math.floor(Math.random()*countType);
    let scAddr = contractInstance.StampArrayFour.call(index);
    let scKeyBytes = contractInstance.StampListFour.call(scAddr);
    console.log("the stamp(type:"+type+",index:"+index+") addr is "+scAddr
        +" keybytes is "+ scKeyBytes);


//check the balance of otaDestAddress
}

main();


