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
const ResponseFunctions = require('./response');

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
        this.stringify = require('json-stringify-deterministic');
        this.sortKeysRecursive = require('sort-keys-recursive');
        this.request = new RequestFunctions();
        this.sharing = new SharingFunctions();
        this.medicine = new MedicineFunctions();
        this.transfer = new TransferFunctions();
        this.response = new ResponseFunctions();
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
    async QueryRequestStatus(ctx, queryHospital, status) {
        let statusFilter;
        try {
            const statusArray = JSON.parse(status);
            if (Array.isArray(statusArray)) {
                statusFilter = { $in: statusArray };
            } else {
                statusFilter = status;
            }
        } catch (e) {
            statusFilter = status;
        }

        const requestQuery = {
            selector: {
                postingHospitalNameEN: queryHospital,
                status: statusFilter,
                ticketType: 'request'
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
                    requestId: request.id
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
            const remainingAmount = await this.medicine.GetRemainingAmount(ctx, request.id);
            request.remainingAmount = remainingAmount;
            request.responseDetails = responses;
            request.responseDetails.sort((a, b) => a.createdAt - b.createdAt);
        }

        return requests;
    }

    async QuerySharingStatus(ctx, queryHospital, status) {
        let statusFilter;
        try {
            const statusArray = JSON.parse(status);
            if (Array.isArray(statusArray)) {
                statusFilter = { $in: statusArray };
            } else {
                statusFilter = status;
            }
        } catch (e) {
            statusFilter = status;
        }

        const sharingQuery = {
            selector: {
                postingHospitalNameEN: queryHospital,
                status: statusFilter,
                ticketType: 'sharing'
            }
        };
        const sharingResults = await ctx.stub.getQueryResult(JSON.stringify(sharingQuery));
        const sharings = [];
        let sharingRes = await sharingResults.next();
        while (!sharingRes.done) {
            const sharing = JSON.parse(sharingRes.value.value.toString('utf8'));
            sharings.push(sharing);
            sharingRes = await sharingResults.next();
        }
        await sharingResults.close();

        // Optimized approach: Query all responses at once, then filter
        const responseQuery = {
            selector: {
                ticketType: 'sharing',
                sharingId: { $exists: true }
            }
        };
        const responseResults = await ctx.stub.getQueryResult(JSON.stringify(responseQuery));
        const allResponses = [];

        let res = await responseResults.next();
        while (!res.done) {
            const record = JSON.parse(res.value.value.toString('utf8'));
            // Only include responses for the sharings we found
            if (sharings.some(sharing => sharing.id === record.sharingId)) {
                allResponses.push(record);
            }
            res = await responseResults.next();
        }
        await responseResults.close();

        // Attach responses to their respective sharings
        for (const sharing of sharings) {
            const responses = allResponses.filter(response => response.sharingId === sharing.id);
            const remainingAmount = await this.medicine.GetRemainingAmount(ctx, sharing.id);
            sharing.remainingAmount = remainingAmount;
            sharing.responseDetails = responses;
            sharing.responseDetails.sort((a, b) => a.createdAt - b.createdAt);
        }
        return sharings;
    }

    async QueryRequestToHospital(ctx, queryHospital, status) {
        // Support both single status (string) and multiple statuses (JSON array string)
        let statusFilter;
        try {
            // Try to parse as JSON array
            const statusArray = JSON.parse(status);
            if (Array.isArray(statusArray)) {
                statusFilter = { $in: statusArray };
            } else {
                statusFilter = status; // Single status
            }
        } catch (e) {
            // If parsing fails, treat as single status
            statusFilter = status;
        }

        const responseQuery = {
            selector: {
                respondingHospitalNameEN: queryHospital,
                status: statusFilter,
                ticketType: 'request'
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

    // Sharing Functions
    async QuerySharingStatusToHospital(ctx, queryHospital, status) {
        // Support both single status (string) and multiple statuses (JSON array string)
        let statusFilter;
        try {
            // Try to parse as JSON array
            const statusArray = JSON.parse(status);
            if (Array.isArray(statusArray)) {
                statusFilter = { $in: statusArray };
            } else {
                statusFilter = status; // Single status
            }
        } catch (e) {
            // If parsing fails, treat as single status
            statusFilter = status;
        }

        const responseQuery = {
            selector: {
                respondingHospitalNameEN: queryHospital,
                status: statusFilter,
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

    async GetRemainingAmount(ctx, id) {
        return this.medicine.GetRemainingAmount(ctx, id);
    }

    async QueryConfirmReturn(ctx, respondingHospitalNameEN, status) {
        return this.response.QueryConfirmReturn(ctx, respondingHospitalNameEN, status);
    }

    async AcceptSharing(ctx, acceptSharingData) {
        return this.sharing.AcceptSharing(ctx, acceptSharingData);
    }

    async UpdateSharingStatus(ctx, sharingId, status, updatedAt) {
        return this.sharing.UpdateStatus(ctx, sharingId, status, updatedAt);
    }

    async UpdateTicketStatus(ctx, id, status, updatedAt) {
        return this.medicine.UpdateTicketStatus(ctx, id, status, updatedAt);
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
