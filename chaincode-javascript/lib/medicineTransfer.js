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

class MedicineTransfer extends Contract {

    async InitMedicines(ctx) {
        const medicines = [
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

        for (const asset of medicines) {
            // asset.docType = 'medicine';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
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
