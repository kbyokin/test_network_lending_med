/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const RequestFunctions = require('./request');
const SharingFunctions = require('./sharing');
const MedicineFunctions = require('./medicine');
const TransferFunctions = require('./transfer');

const hospitalEntities = [
    {
        nameTH: 'โีรงพยาบาลหาดใหญ่',
        nameEN: 'Hat Yai Hospital',
        id: 'hatyaiHospitalMSP',
        address: '123 Main St, City A',
    },
    {
        nameTH: 'โีรงพยาบาลสงขลา',
        nameEN: 'Songkhla Hospital',
        id: 'songkhlaHospitalMSP',
        address: '123 Main St, City A',
    },
    {
        nameTH: 'โีรงพยาบาลนาหม่อม',
        nameEN: 'Na Mom Hospital',
        id: 'namomHospitalMSP',
        address: '456 Elm St, City B',
    },
    {
        nameTH: 'โีรงพยาบาลสิงหนคร',
        nameEN: 'Singha Nakhon Hospital',
        id: 'singhanakohnHospitalMSP',
        address: '789 Oak St, City C',
    },
];

class MedicineTransfer extends Contract {
    constructor() {
        super();
        this.request = new RequestFunctions();
        this.sharing = new SharingFunctions();
        this.medicine = new MedicineFunctions();
        this.transfer = new TransferFunctions();
    }

    async InitMedicines(ctx) {
        const ledgers = [
            {
                id: 'medicine1_test',
                transactionType: 'requestMed',
                requestId: 'REQ-0001-123',
                postingHospitalId: hospitalEntities[0].id,
                postingHospitalNameEN: hospitalEntities[0].nameEN,
                postingHospitalNameTH: hospitalEntities[0].nameTH,
                postingHospitalAddress: hospitalEntities[0].address,
                status: 'open',
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                urgent: true,
                requestMedicine: {
                    name: 'Paracetamol',
                    trademark: 'Adrenaline Injection',
                    quantity: 100,
                    pricePerUnit: 150,
                    unit: '1mg/1ml',
                    batchNumber: 'B12345',
                    manufacturer: 'Pharma Inc.',
                    manufactureDate: '1743572230567',
                    expiryDate: '1743572230567',
                    imageRef: 'base64encodedstring'
                },
                requestTerm: {
                    expectedReceiveDate: '1743572230567',
                    receiveConditions: {
                        exactType: false,
                        subsidiary: true,
                        other: true,
                        notes: 'Equivalent brands also acceptable'
                    }
                }
            }
        ];

        for (const asset of ledgers) {
            await ctx.stub.putState(asset.id, Buffer.from(JSON.stringify(asset)));
        }
    }

    // Request Functions
    async CreateMedicineRequest(ctx, requestData, hospitalList) {
        return this.request.CreateRequest(ctx, requestData, hospitalList);
    }

    async CreateMedicineSharing(ctx, sharingData, hospitalList) {
        return this.sharing.CreateSharing(ctx, sharingData, hospitalList);
    }

    async CreateMedicineResponse(ctx, responseData) {
        const data = JSON.parse(responseData);
        const responseExists = await this.medicine.MedicineExists(ctx, data.responseId);
        if (!responseExists) {
            throw new Error(`The response ${data.responseId} does not exist`);
        }
        const responseAssetString = await this.medicine.ReadMedicine(ctx, data.responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const requestExists = await this.medicine.MedicineExists(ctx, responseAsset.requestId);
        if (!requestExists) {
            throw new Error(`The request ${responseAsset.requestId} does not exist`);
        }
        const requestAssetString = await this.medicine.ReadMedicine(ctx, responseAsset.requestId);
        const requestAsset = JSON.parse(requestAssetString);
        responseAsset.status = data.status;
        responseAsset.updatedAt = data.updatedAt;
        responseAsset.offeredMedicine = data.offeredMedicine;
        await ctx.stub.putState(responseAsset.id, Buffer.from(JSON.stringify(responseAsset)));
        return JSON.stringify({
            requestId: requestAsset.requestId,
            responseId: data.responseId,
            updatedAt: data.updatedAt
        });
    }

    // Transfer Functions
    async CreateMedicineTransfer(ctx, responseId, updatedAt) {
        return this.transfer.CreateMedicineTransfer(ctx, responseId, updatedAt);
    }

    async CreateMedicineReturn(ctx, responseId, returnData) {
        return this.transfer.CreateMedicineReturn(ctx, responseId, returnData);
    }

    // Query Functions
    async QueryRequestStatus(ctx, queryHospital) {
        const requestQuery = {
            selector: {
                postingHospitalNameEN: queryHospital
            }
        };

        const requestResults = await ctx.stub.getQueryResult(JSON.stringify(requestQuery));
        const requests = [];

        let reqRes = await requestResults.next();
        while (!reqRes.done) {
            const request = JSON.parse(reqRes.value.value.toString('utf8'));
            requests.push(request);
            reqRes = await requestResults.next();
        }
        await requestResults.close();

        const allResponses = [];

        for (const request of requests) {
            const responseQuery = {
                selector: {
                    requestId: request.id,
                    ticketType: 'request'
                }
            };

            const responseResults = await ctx.stub.getQueryResult(JSON.stringify(responseQuery));

            let res = await responseResults.next();
            while (!res.done) {
                const record = JSON.parse(res.value.value.toString('utf8'));
                allResponses.push(record);
                res = await responseResults.next();
            }
            await responseResults.close();
        }

        for (const request of requests) {
            const responses = allResponses.filter(response => response.requestId === request.id);
            request.responseDetails = responses;
            request.responseDetails.sort((a, b) => a.createdAt - b.createdAt);
        }

        return requests;
    }

    async QuerySharingStatusToHospital(ctx, queryHospital) {
        const responseQuery = {
            selector: {
                respondingHospitalNameEN: queryHospital,
                status: 'pending',
                ticketType: 'sharing'
            }
        };
        const responseResults = await ctx.stub.getQueryResult(JSON.stringify(responseQuery));
        const enrichedResponses = [];
        const requestCache = {};
        let res = await responseResults.next();
        while (!res.done) {
            const response = JSON.parse(res.value.value.toString('utf8'));
            const sharingId = response.sharingId;
            if (!requestCache[sharingId]) {
                const sharingBytes = await ctx.stub.getState(sharingId);
                if (sharingBytes && sharingBytes.length > 0) {
                    const sharing = JSON.parse(sharingBytes.toString('utf8'));
                    requestCache[sharingId] = sharing;
                } else {
                    requestCache[sharingId] = null;
                }
            }
            response.sharingDetails = requestCache[sharingId];
            enrichedResponses.push(response);
            res = await responseResults.next();
        }
        await responseResults.close();
        return enrichedResponses;
    }

    async QueryRequestToHospital(ctx, queryHospital, status) {
        const responseQuery = {
            selector: {
                respondingHospitalNameEN: queryHospital,
                status: status
            }
        };

        const responseResults = await ctx.stub.getQueryResult(JSON.stringify(responseQuery));
        const enrichedResponses = [];
        const requestCache = {};

        let res = await responseResults.next();
        while (!res.done) {
            const response = JSON.parse(res.value.value.toString('utf8'));
            const requestId = response.requestId;

            if (!requestCache[requestId]) {
                const requestBytes = await ctx.stub.getState(requestId);
                if (requestBytes && requestBytes.length > 0) {
                    const request = JSON.parse(requestBytes.toString('utf8'));
                    requestCache[requestId] = request;
                } else {
                    requestCache[requestId] = null;
                }
            }

            response.requestDetails = requestCache[requestId];
            enrichedResponses.push(response);
            res = await responseResults.next();
        }

        await responseResults.close();
        return enrichedResponses;
    }

    // Medicine Functions
    async CreateMedicine(ctx, id, postingDate, postingHospital, medicineName, quantity, unit, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, status) {
        return this.medicine.CreateMedicine(ctx, id, postingDate, postingHospital, medicineName, quantity, unit, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, status);
    }

    async BorrowMedicine(ctx, id, borrowID, borrowingHospital, requestedQuantity, borrowDate) {
        return this.medicine.BorrowMedicine(ctx, id, borrowID, borrowingHospital, requestedQuantity, borrowDate);
    }

    async ShipmentUpdates(ctx, id, statusDate, shipmentStatus) {
        return this.medicine.ShipmentUpdates(ctx, id, statusDate, shipmentStatus);
    }

    async ReadMedicine(ctx, id) {
        return this.medicine.ReadMedicine(ctx, id);
    }

    async UpdateMedicine(ctx, id, name, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, temperature, price) {
        return this.medicine.UpdateMedicine(ctx, id, name, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, temperature, price);
    }

    async DeleteMedicine(ctx, id) {
        return this.medicine.DeleteMedicine(ctx, id);
    }

    async MedicineExists(ctx, id) {
        return this.medicine.MedicineExists(ctx, id);
    }

    async TransferMedicine(ctx, id, newOwner) {
        return this.medicine.TransferMedicine(ctx, id, newOwner);
    }

    async GetAllMedicines(ctx) {
        return this.medicine.GetAllMedicines(ctx);
    }
}

module.exports = MedicineTransfer;
