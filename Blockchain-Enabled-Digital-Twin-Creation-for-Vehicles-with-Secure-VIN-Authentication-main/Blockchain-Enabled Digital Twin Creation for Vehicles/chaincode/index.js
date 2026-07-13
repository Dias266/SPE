/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const VehicleChaincode = require('./vehicle-chaincode');

module.exports.VehicleChaincode = VehicleChaincode;
module.exports.contracts = [VehicleChaincode];
