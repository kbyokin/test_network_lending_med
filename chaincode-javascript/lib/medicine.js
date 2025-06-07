'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class MedicineFunctions {
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

    async ReadMedicine(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    async UpdateMedicine(ctx, id, name, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, temperature, price) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

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
        return ctx.stub.putState(id, Buffer.from(stringify(updatedAsset)));
    }

    async DeleteMedicine(ctx, id) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    async MedicineExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    async TransferMedicine(ctx, id, newOwner) {
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    async GetAllMedicines(ctx) {
        const allResults = [];
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

module.exports = MedicineFunctions; 