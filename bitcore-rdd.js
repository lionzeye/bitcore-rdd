// Thanks to hrobeers (Peercoin)
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Running this file patches bitcore-lib to work on the reddcoin blockchain.
// * Sets reddcoin as the default network.
// * Patches bitcore-lib.Transaction to include reddcoin's timestamp.

'use strict';

var bitcore = require('bitcore-lib');

//
// Set reddcoin as default network
//

bitcore.Networks.add({
    name: 'reddcoin',
    alias: 'rdd',
    pubkeyhash: 0x3D,
    privatekey: 0xBD,
    scripthash: 0x05,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4,
  });

bitcore.Networks.add({
    name: 'reddcoin-testnet',
    alias: 'rdd-test',
    pubkeyhash: 0x6f,
    privatekey: 0xef,
    scripthash: 0xc4,
    xpubkey: 0x043587cf,
    xprivkey: 0x04358394,
  });

bitcore.Networks.defaultNetwork = bitcore.Networks.get('reddcoin');


//
// Overwrite transaction serialization to include reddcoin's timestamp
//

var Transaction = bitcore.Transaction;
var Input = Transaction.Input;
var Output = Transaction.Output;

var _ = require('lodash');

Transaction.prototype.toBufferWriter = function(writer) {
  writer.writeUInt32LE(this.version);

  writer.writeVarintNum(this.inputs.length);
  _.each(this.inputs, function(input) {
    input.toBufferWriter(writer);
  });
  writer.writeVarintNum(this.outputs.length);
  _.each(this.outputs, function(output) {
    output.toBufferWriter(writer);
  });
  
  writer.writeUInt32LE(this.nLockTime);
  
  // rdd: if no timestamp present, take current time (in seconds)
  if(this.version > 1) {
	  var timestamp = this.timestamp ? this.timestamp : new Date().getTime()/1000;
	  writer.writeUInt32LE(timestamp);
  }
  
  return writer;
};

var checkArgument = function(condition, argumentName, message, docsPath) {
  if (!condition) {
    throw new bitcore.errors.InvalidArgument(argumentName, message, docsPath);
  }
};

Transaction.prototype.fromBufferReader = function(reader) {
  checkArgument(!reader.finished(), 'No transaction data received');
  var i, sizeTxIns, sizeTxOuts;

  this.version = reader.readUInt32LE();

  sizeTxIns = reader.readVarintNum();
  for (i = 0; i < sizeTxIns; i++) {
    var input = Input.fromBufferReader(reader);
    this.inputs.push(input);
  }
  sizeTxOuts = reader.readVarintNum();
  for (i = 0; i < sizeTxOuts; i++) {
    this.outputs.push(Output.fromBufferReader(reader));
  }
  
  this.nLockTime = reader.readUInt32LE();
  
  // rdd: deserialize timestamp
  if(this.version > 1)
	  this.timestamp = reader.readUInt32LE();
  else
	  this.timestamp = 0;
  
  return this;
};

module.exports = bitcore;