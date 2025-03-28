/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const medicineTransfer = require('./lib/medicineTransfer');

module.exports.MedicineTransfer = medicineTransfer;
module.exports.contracts = [medicineTransfer];