/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const RequestFunctions = require('./request');
const SharingFunctions = require('./sharing');

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
    }

    async InitMedicines(ctx) {
        const _medicines = [
            {
                id: 'medicine1',
                postingDate: '1743572230267',
                postingHospital: 'Hat Yai Hospital',
                status: 'Available',
                urgent: true,
                medicine: {
                    name: 'Paracetamol',
                    quantity: 100,
                    unit: 'mg',
                    batchNumber: 'B12345',
                    manufacturer: 'Pharma Inc.',
                    manufactureDate: '1743572230245',
                    expiryDate: '1743572230567',
                    image: 'base64encodedstring'
                },
                request: {
                    expectedReceiveDate: '1743572230567', // Unix timestamp
                    receiveConditions: {
                        exactType: false,
                        subsidiary: true,
                        other: true
                    }
                },
                responses: [
                    {
                        hospitalId: 'hospital-b',
                        hospitalName: 'Hospital B',
                        status: 'Accepted',
                        offer: {
                            medicineName: 'ParacetamolF',
                            manufacturer: 'A',
                            expiryDate: '1743572230567',
                            quantity: 45,
                            pricePerUnit: 300,
                            returnConditions: {
                                sameUnit: false,
                                subsidiary: true,
                                sameValue: true,
                                other: true
                            }
                        },
                        return: {
                            status: 'Completed',
                            option: 'Subsidiary',
                            details: {
                                medicineName: 'ParacetamolW',
                                manufacturer: 'AB',
                                expiryDate: '1743572230567',
                                quantity: 45,
                                pricePerUnit: 290
                            }
                        }
                    },
                    {
                        hospitalId: 'hospital-c',
                        hospitalName: 'Hospital C',
                        status: 'Rejected',
                        offer: null,
                        return: {
                            status: null,
                            option: null,
                            details: null
                        }
                    },
                    {
                        hospitalId: 'hospital-d',
                        hospitalName: 'Hospital D',
                        status: 'Pending',
                        offer: null,
                        return: {
                            status: 'Pending',
                            option: null,
                            details: null
                        }
                    }
                ]
            },
            {
                ID: 'medicine1',
                PostingDate: '1743572230267',
                PostingHospital: 'Hospital A',
                MedicineName: 'Paracetamol',
                Quantity: 100,
                Unit: 'mg',
                BatchNumber: 'B12345',
                Manufacturer: 'Pharma Inc.',
                ManufactureDate: '1743572230245',
                ExpiryDate: '1743572230567', // 1 year later
                CurrentLocation: 'Warehouse A',
                Status: 'Available',
                BorrowRecords: [],
                ShipmentDetails: []
            },
            {
                ID: 'MED-002',
                PostingDate: '1743572230567', // 7 days ago
                PostingHospital: 'Hospital B',
                MedicineName: 'Amoxicillin',
                Quantity: 250,
                Unit: 'mg',
                BatchNumber: 'B67890',
                Manufacturer: 'MediCorp',
                ManufactureDate: '1743572230567', // 90 days ago
                ExpiryDate: '1743572230567', // 2 years later
                CurrentLocation: 'Pharmacy',
                Status: 'In Use',
                BorrowRecords: [
                    {
                        BorrowDate: '1743572230567',
                        BorrowedBy: 'Dr. Smith',
                        Purpose: 'Emergency Department',
                        QuantityBorrowed: 50,
                        ReturnDate: '1743572230567'
                    }
                ],
                ShipmentDetails: [
                    {
                        ShipmentDate: '1743572230567',
                        ShippedFrom: 'Central Warehouse',
                        ShippedTo: 'Hospital B',
                        Carrier: 'MedEx Logistics',
                        TrackingNumber: 'SHP12345'
                    }
                ]
            },
            {
                ID: 'MED-003',
                PostingDate: '1743572230567', // 14 days ago
                PostingHospital: 'Hospital C',
                MedicineName: 'Lisinopril',
                Quantity: 10,
                Unit: 'mg',
                BatchNumber: 'L54321',
                Manufacturer: 'CardioPharm',
                ManufactureDate: '1743572230567', // 120 days ago
                ExpiryDate: '1743572230567', // 1.5 years later
                CurrentLocation: 'Cardiology Department',
                Status: 'Limited Stock',
                BorrowRecords: [],
                ShipmentDetails: [
                    {
                        ShipmentDate: '1743572230567',
                        ShippedFrom: 'Manufacturer Warehouse',
                        ShippedTo: 'Hospital C',
                        Carrier: 'PharmaShip',
                        TrackingNumber: 'PS78901'
                    }
                ]
            },
            {
                ID: 'MED-004',
                PostingDate: '1743572230567', // 3 days ago
                PostingHospital: 'Hospital A',
                MedicineName: 'Insulin Glargine',
                Quantity: 100,
                Unit: 'units/ml',
                BatchNumber: 'I98765',
                Manufacturer: 'DiabeCare',
                ManufactureDate: '1743572230567', // 45 days ago
                ExpiryDate: '1743572230567', // 6 months later
                CurrentLocation: 'Cold Storage',
                Status: 'Available',
                BorrowRecords: [],
                ShipmentDetails: [
                    {
                        ShipmentDate: '1743572230567',
                        ShippedFrom: 'DiabeCare Distribution Center',
                        ShippedTo: 'Hospital A',
                        Carrier: 'ColdChain Logistics',
                        TrackingNumber: 'CC24680',
                        Temperature: '2-8°C'
                    }
                ]
            },
            {
                ID: 'MED-005',
                PostingDate: '1743572230567', // 30 days ago
                PostingHospital: 'Hospital D',
                MedicineName: 'Metformin',
                Quantity: 500,
                Unit: 'mg',
                BatchNumber: 'M13579',
                Manufacturer: 'GeneriPharm',
                ManufactureDate: '1743572230567', // 180 days ago
                ExpiryDate: '1743572230567', // 2.5 years later
                CurrentLocation: 'Outpatient Pharmacy',
                Status: 'Available',
                BorrowRecords: [
                    {
                        BorrowDate: '1743572230567',
                        BorrowedBy: 'Dr. Johnson',
                        Purpose: 'Clinical Trial',
                        QuantityBorrowed: 100,
                        ReturnDate: null
                    }
                ],
                ShipmentDetails: [
                    {
                        ShipmentDate: '1743572230567',
                        ShippedFrom: 'Regional Distribution Center',
                        ShippedTo: 'Hospital D',
                        Carrier: 'MedLogistics',
                        TrackingNumber: 'ML97531'
                    }
                ]
            },
            {
                ID: 'MED-006',
                PostingDate: '1743572230567', // 1 day ago
                PostingHospital: 'Hospital B',
                MedicineName: 'Morphine Sulfate',
                Quantity: 15,
                Unit: 'mg/ml',
                BatchNumber: 'MS24680',
                Manufacturer: 'PainRelief Pharmaceuticals',
                ManufactureDate: '1743572230567', // 60 days ago
                ExpiryDate: '1743572230567', // 2 years later
                CurrentLocation: 'Secured Storage',
                Status: 'Controlled Substance',
                BorrowRecords: [],
                ShipmentDetails: [
                    {
                        ShipmentDate: '1743572230567',
                        ShippedFrom: 'Central Pharmacy',
                        ShippedTo: 'Hospital B',
                        Carrier: 'SecureTransport',
                        TrackingNumber: 'ST36912',
                        SecurityProtocol: 'Level 3'
                    }
                ]
            }
        ];

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
            },
            {
                id: 'medicine2_test',
                transactionType: 'requestMed',
                requestId: 'REQ-0002-123',
                postingHospitalId: hospitalEntities[1].id,
                postingHospitalNameEN: hospitalEntities[1].nameEN,
                postingHospitalNameTH: hospitalEntities[1].nameTH,
                postingHospitalAddress: hospitalEntities[1].address,
                status: 'open',
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                urgent: true,
                requestMedicine: {
                    name: 'Ardenaline',
                    quantity: 100,
                    unit: 'mg',
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
            },
            {
                id: 'respond-0002_xxxx1',
                transactionType: 'responseMed',
                responseId: 'RESP-0002-456',
                requestId: 'medicine1_test',
                respondingHospitalId: hospitalEntities[1].id,
                respondingHospitalNameEN: hospitalEntities[1].nameEN,
                respondingHospitalNameTH: hospitalEntities[1].nameTH,
                respondingHospitalAddress: hospitalEntities[1].address,
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                status: 'Accepted',
                offeredMedicine: {
                    name: 'ParacetamolF',
                    manufacturer: 'A',
                    expiryDate: '1743572230567',
                    quantity: 45,
                    pricePerUnit: 300,
                    returnTerm: {
                        sameUnit: false,
                        subsidiary: true,
                        sameValue: true,
                        other: true,
                        notes: 'Equivalent brands also acceptable'
                    }
                },
            },
            {
                id: 'respond-0003_xxxx1',
                transactionType: 'responseMed',
                responseId: 'RESP-0003-789',
                requestId: 'medicine1_test',
                respondingHospitalId: hospitalEntities[2].id,
                respondingHospitalNameEN: hospitalEntities[2].nameEN,
                respondingHospitalNameTH: hospitalEntities[2].nameTH,
                respondingHospitalAddress: hospitalEntities[2].address,
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                status: 'Pending',
                offeredMedicine: null,
                returnMedicine: null
            },
            {
                id: 'respond-0003_xxxx2',
                transactionType: 'responseMed',
                responseId: 'RESP-0003-799',
                requestId: 'medicine2_test',
                respondingHospitalId: hospitalEntities[2].id,
                respondingHospitalNameEN: hospitalEntities[2].nameEN,
                respondingHospitalNameTH: hospitalEntities[2].nameTH,
                respondingHospitalAddress: hospitalEntities[2].address,
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                status: 'Pending',
                offeredMedicine: null,
                returnMedicine: null
            },
            {
                id: 'respond-0004_xxxx1',
                transactionType: 'responseMed',
                responseId: 'RESP-0004-101112',
                requestId: 'medicine1_test',
                respondingHospitalId: hospitalEntities[3].id,
                respondingHospitalNameEN: hospitalEntities[3].nameEN,
                respondingHospitalNameTH: hospitalEntities[3].nameTH,
                respondingHospitalAddress: hospitalEntities[3].address,
                createdAt: '1743572230567',
                updatedAt: '1743572230567',
                status: 'Rejected',
                offeredMedicine: null,
                returnMedicine: null
            },
            {
                id: 'transfer-0001-131415',
                transactionType: 'transferMed',
                requestId: 'medicine1_test',
                responseId: 'RESP-0001-456',
                transferId: 'TRANS-0001-131415',
                fromHospitalId: hospitalEntities[0].id,
                fromHospitalNameEN: hospitalEntities[0].nameEN,
                fromHospitalNameTH: hospitalEntities[0].nameTH,
                fromHospitalAddress: hospitalEntities[0].address,
                toHospitalId: hospitalEntities[1].id,
                toHospitalNameEN: hospitalEntities[1].nameEN,
                toHospitalNameTH: hospitalEntities[1].nameTH,
                toHospitalAddress: hospitalEntities[1].address,     // need to make it more dynamic later
                createdAt: '1743572230567',
                status: 'Completed',
                shipmentDetails: {
                    trackingNumber: 'SHP12345',
                    carrier: 'MedEx Logistics',
                    shippedFrom: 'Central Warehouse',
                    shippedTo: 'Hospital B',
                    shipmentDate: '1743572230567'
                },
            },
            {
                id: 'return-0001-161718',
                transactionType: 'returnMed',
                requestId: 'medicine1_test',
                responseId: 'RESP-0002-456',
                transferId: 'TRANS-0001-131415',
                returnId: 'RETR-0001-161718',
                fromHospitalId: hospitalEntities[1].id,
                fromHospitalNameEN: hospitalEntities[1].nameEN,
                fromHospitalNameTH: hospitalEntities[1].nameTH,
                fromHospitalAddress: hospitalEntities[1].address,
                toHospitalId: hospitalEntities[0].id,
                toHospitalNameEN: hospitalEntities[0].nameEN,
                toHospitalNameTH: hospitalEntities[0].nameTH,
                toHospitalAddress: hospitalEntities[0].address,     // need to make it more dynamic later
                createdAt: '1743572230567',
                status: 'Pending',
                returnMedicine: {
                    name: 'ParacetamolW',
                    manufacturer: 'AB',
                    expiryDate: '1743572230567',
                    quantity: 45,
                    pricePerUnit: 290
                },
            }
        ];

        for (const asset of ledgers) {
            // asset.docType = 'medicine';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.id, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // =========================== Request Functions ==========================

    /*
    Create new medicine request
    */
    async CreateMedicineRequest(ctx, requestData, hospitalList) {
        return this.request.CreateRequest(ctx, requestData, hospitalList);
    }

    async CreateMedicineSharing(ctx, sharingData, hospitalList) {
        return this.sharing.CreateSharing(ctx, sharingData, hospitalList);
    }

    async CreateMedicineResponse(ctx, responseData) {
        const data = JSON.parse(responseData);
        // Check if responseId exists
        const responseExists = await this.MedicineExists(ctx, data.responseId);
        if (!responseExists) {
            throw new Error(`The response ${data.responseId} does not exist`);
        }
        const responseAssetString = await this.ReadMedicine(ctx, data.responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const requestExists = await this.MedicineExists(ctx, responseAsset.requestId);
        if (!requestExists) {
            throw new Error(`The request ${responseAsset.requestId} does not exist`);
        }
        const requestAssetString = await this.ReadMedicine(ctx, responseAsset.requestId);
        const requestAsset = JSON.parse(requestAssetString);
        // Update response status
        responseAsset.status = data.status;
        responseAsset.updatedAt = data.updatedAt;
        responseAsset.offeredMedicine = data.offeredMedicine;
        await ctx.stub.putState(responseAsset.id, Buffer.from(stringify(sortKeysRecursive(responseAsset))));
        return JSON.stringify({
            requestId: requestAsset.requestId,
            responseId: data.responseId,
            updatedAt: data.updatedAt
        });
    }

    async CreateMedicineTransfer(ctx, responseId, updatedAt) {
        const responseExists = await this.MedicineExists(ctx, responseId);
        if (!responseExists) {
            throw new Error(`The asset ${responseId} does not exist`);
        }
        const responseAssetString = await this.ReadMedicine(ctx, responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const requestExists = await this.MedicineExists(ctx, responseAsset.requestId);
        if (!requestExists) {
            throw new Error(`The request ${responseAsset.requestId} does not exist`);
        }
        if (responseAsset.status !== 'accepted') {
            throw new Error(`The response ${responseId} is not in pending status`);
        }
        responseAsset.status = 'inTransfer';
        responseAsset.updatedAt = updatedAt;
        await ctx.stub.putState(responseAsset.id, Buffer.from(stringify(sortKeysRecursive(responseAsset))));

        const requestAssetString = await this.ReadMedicine(ctx, responseAsset.requestId);
        const requestAsset = JSON.parse(requestAssetString);
        // Create new transfer record
        const transferId = `TRANS-${requestAsset.id}-${requestAsset.postingHospitalId}`;
        const transferAsset = {
            transferId: transferId,
            requestId: requestAsset.requestId,
            responseId: responseAsset.responseId,
            fromHospitalId: responseAsset.postingHospitalId,
            fromHospitalNameEN: responseAsset.postingHospitalNameEN,
            toHospitalId: responseAsset.respondingHospitalId,
            toHospitalNameEN: responseAsset.respondingHospitalNameEN,
            createdAt: updatedAt,
            status: 'inTransfer',
            shipmentDetails: {
                trackingNumber: null,
                carrier: null,
                shippedFrom: null,
                shippedTo: null,
                shipmentDate: null
            }
        };
        await ctx.stub.putState(transferAsset.transferId, Buffer.from(stringify(sortKeysRecursive(transferAsset))));
        return JSON.stringify({
            requestId: requestAsset.requestId,
            transferId: transferAsset.transferId,
            updatedAt: updatedAt,
            status: 'inTransfer',
        });
    }

    async CreateMedicineReturn(ctx, responseId, returnData) {
        // fetch response transaction
        const responseExists = await this.MedicineExists(ctx, responseId);
        if (!responseExists) {
            throw new Error(`The asset ${responseId} does not exist`);
        }
        const responseAssetString = await this.ReadMedicine(ctx, responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const returnAsset = JSON.parse(returnData);
        responseAsset.status = 'confirm-return';
        responseAsset.returnMedicine = returnAsset;
        responseAsset.updatedAt = returnAsset.updatedAt;
        await ctx.stub.putState(responseAsset.id, Buffer.from(stringify(sortKeysRecursive(responseAsset))));
        return JSON.stringify({
            requestId: responseAsset.requestId,
            responseId: responseId,
            status: 'confirm-return'
        });
    }

    async AcceptSharing(ctx, sharingId, accepetOffer, updatedAt) {
        const sharingResponseExists = await this.MedicineExists(ctx, sharingId);
        if (!sharingResponseExists) {
            throw new Error(`The asset ${sharingId} does not exist`);
        }
        const sharingResponseAssetString = await this.ReadMedicine(ctx, sharingId);
        const sharingResponseAsset = JSON.parse(sharingResponseAssetString);
        const offer = JSON.parse(accepetOffer);
        sharingResponseAsset.status = 'accepted';
        sharingResponseAsset.acceptedOffer = offer.acceptOffer;
        sharingResponseAsset.returnTerm = offer.returnTerm;

        await ctx.stub.putState(sharingResponseAsset.id, Buffer.from(stringify(sortKeysRecursive(sharingResponseAsset))));
        return JSON.stringify({
            sharingId: sharingId,
            status: 'accepted'
        });
    }

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

        // Put response data into request data and sort by createdAt
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
            } else {
                console.log('Using cached sharing:', sharingId);
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

        // ✅ Create in-memory cache for requestId → requestDetails
        const requestCache = {};

        let res = await responseResults.next();
        while (!res.done) {
            const response = JSON.parse(res.value.value.toString('utf8'));
            const requestId = response.requestId;

            // 🔄 Use cache or fetch from ledger
            if (!requestCache[requestId]) {
                console.log('Fetching request from ledger:', requestId);
                const requestBytes = await ctx.stub.getState(requestId);
                if (requestBytes && requestBytes.length > 0) {
                    const request = JSON.parse(requestBytes.toString('utf8'));
                    requestCache[requestId] = request;
                } else {
                    requestCache[requestId] = null;
                }
            } else {
                console.log('Using cached request:', requestId);
            }

            response.requestDetails = requestCache[requestId];
            enrichedResponses.push(response);
            res = await responseResults.next();
        }

        await responseResults.close();
        return enrichedResponses;
    }


    async ReadAssetById(ctx, id) {
        const ledgerJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!ledgerJSON || ledgerJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ledgerJSON.toString();
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateMedicine(ctx, id, postingDate, postingHospital, medicineName, quantity, unit, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, status) {
        const exists = await this.MedicineExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const asset = {
            ID: id,
            PostingDate: postingDate,
            PostingHospital: postingHospital,
            MedicineName: medicineName,
            Quantity: quantity,
            Unit: unit,
            BatchNumber: batchNumber,
            Manufacturer: manufacturer,
            ManufactureDate: manufacturerDate,
            ExpiryDate: expiryDate,
            CurrentLocation: currentLocation,
            Status: status,
            BorrowRecords: [],
            ShipmentDetails: [],
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(asset)));
        return JSON.stringify(asset);
    }

    async BorrowMedicine(ctx, id, borrowID, borrowingHospital, requestedQuantity, borrowDate) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const requestedQty = parseInt(requestedQuantity, 10);
        if (asset.Quantity < requestedQty) {
            throw new Error(`Not enough quantity available for borrowing. Available: ${asset.Quantity}, Requested: ${requestedQuantity}`);
        }
        asset.Quantity -= requestedQty;
        const borrowRecord = {
            BorrowID: borrowID,
            BorrowingHospital: borrowingHospital,
            RequestedQuantity: requestedQty,
            BorrowDate: borrowDate,
            Status: 'Borrowed',
        };
        asset.BorrowRecords.push(borrowRecord);
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    async ShipmentUpdates(ctx, id, statusDate, shipmentStatus) {
        const shipmentID = `shipment${String(Date.now())}`;
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const shipmentRecord = {
            ShipmentID: shipmentID,
            StatusDate: statusDate,
            ShipmentStatus: shipmentStatus,
        };
        asset.ShipmentDetails.push(shipmentRecord);
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadMedicine(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateMedicine(ctx, id, name, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, temperature, price) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Name: name,
            BatchNumber: batchNumber,
            Manufacturer: manufacturer,
            ManufactureDate: manufacturerDate,
            ExpiryDate: expiryDate,
            CurrentLocation: currentLocation,
            Temperature: temperature,
            Price: price,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(updatedAsset)));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteMedicine(ctx, id) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async MedicineExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferMedicine(ctx, id, newOwner) {
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllMedicines(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = MedicineTransfer;
