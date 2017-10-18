//todo: 

var config = require('../config');
var stampType = config.stampType;

function caculateValue(type, instance){
	let value = 0;
	if(type === stampType.TypeOne){
		value = 1 *instance.stampPrice.call();
	}else if(type === stampType.TypeTwo) {
		value = 2 *instance.stampPrice.call();
	}else if(type === stampType.TypeFour) {
		value = 4 *instance.stampPrice.call();
	}else if(type === stampType.TypeEight) {
		value = 8 *instance.stampPrice.call();
	}else if(type === stampType.TypeSixteen) {
		value = 16 *instance.stampPrice.call();
	}else{
		value = 0;
	}
	return value;
}

module.exports = caculateValue;
