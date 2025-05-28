/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const channelName = envOrDefault('CHANNEL_NAME', 'main-channel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'hospitalaMSP');

// Path to crypto materials.
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'organizations',
        'peerOrganizations',
        'hospitala.example.com'
    )
);

// Path to user private key directory.
const keyDirectoryPath = envOrDefault(
    'KEY_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@hospitala.example.com',
        'msp',
        'keystore'
    )
);

// Path to user certificate directory.
const certDirectoryPath = envOrDefault(
    'CERT_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@hospitala.example.com',
        'msp',
        'signcerts'
    )
);

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
    'TLS_CERT_PATH',
    path.resolve(cryptoPath, 'peers', 'peer0.hospitala.example.com', 'tls', 'ca.crt')
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.hospitala.example.com');

const utf8Decoder = new TextDecoder();
const assetId = `asset${String(Date.now())}`;

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

const now = Date.now()
const daysFromNow = (days) => {
    const now = Date.now();
    const futureTimeStamp = now + days * 24 * 60 * 60 * 1000;
    // return new Date(addDays).toString();
    return futureTimeStamp.toString();
}

async function main() {
    displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);

        // create sharing asset
        await createSharingAsset(contract);
        // await querySharingStatusToHospital(contract);

        // Query all medicines: RichQuery
        // console.log('*** Query all medicines:');
        // await getAllAssets(contract);

        // Test request flow
        // 1: Create hospitalA request medicine to desired hospitals
        // const createReqResult = await createRequestAsset(contract);
        // console.log('*** createReqResult Result:', createReqResult);
        // await readAssetByID(contract, createReqResult.requestId);
        // // 2: hospitalB responds to hospitalA's request
        // console.log("---> Before: hospitalB's response");
        // const assetId = createReqResult.responsesCreated[0];
        // await readAssetByID(contract, assetId);
        // await updateResponseAsset(contract, assetId);
        // console.log("---> After: hospitalB's response");
        // await readAssetByID(contract, assetId);
        // // 3: hospitalA approved hospitalB's response and therefore transferTransaction got created
        // const result = await createTransferAsset(contract, assetId);
        // console.log('*** Result:', result.transferId);
        // 4: hospitalB updates shipment details in transferTransaction
        // 5: hospitalA confirm delivery and therefore create returnTransaction
        // await createReturnAsset(contract, "RESP-REQ-1748145276880-2");
        // 6: hospitalB confirm delivery and therefore update this returnTransaction
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * This type of transaction would typically only be run once by an application the first time it was started after its
 * initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
 */
async function initLedger(contract) {
    console.log(
        '\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger'
    );

    await contract.submitTransaction('InitMedicines');

    console.log('*** Transaction committed successfully');
}

/**
 * Evaluate a transaction to query ledger state.
 */
async function getAllAssets(contract) {
    console.log(
        '\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger'
    );

    // const resultBytes = await contract.evaluateTransaction('QueryRequestStatus');
    const resultBytes = await contract.submitTransaction('QueryRequestToHospital', 'Na Mom Hospital', 'to-transfer');

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log(result[0].responses);
    console.log('*** Result:', result);
}

async function querySharingStatusToHospital(contract) {
    console.log(
        '\n--> Evaluate Transaction: QuerySharingStatusToHospital'
    );
    const resultBytes = await contract.submitTransaction('QuerySharingStatusToHospital', 'Na Mom Hospital');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

/**
 * Submit a transaction synchronously, blocking until it has been committed to the ledger.
 */
async function createRequestAsset(contract) {
    console.log(
        '\n--> Submit Transaction: CreateAsset'
    );
    const assetId = `REQ-${now.toString()}`;

    const asset = {
        id: assetId,
        postingHospitalId: hospitalEntities[0].id,
        postingHospitalNameEN: hospitalEntities[0].nameEN,
        postingHospitalNameTH: hospitalEntities[0].nameTH,
        postingHospitalAddress: hospitalEntities[0].address,
        status: 'in-progress',
        createdAt: now.toString(),
        updatedAt: now.toString(),
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
            imageRef: 'base64encodedstring'
        },
        requestTerm: {
            expectedReturnDate: daysFromNow(10),
            receiveConditions: {
                exactType: false,
                subsidiary: true,
                other: true,
                notes: 'Equivalent brands also acceptable'
            }
        }
    }

    const hospitalList = [
        {
            nameTH: 'โีรงพยาบาลนาหม่อม',
            nameEN: 'Na Mom Hospital',
            id: 'namomHospitalMSP',
            address: '456 Elm St, City B',
        },
        {
            nameTH: 'โีรงพยาบาลสงขลา',
            nameEN: 'Songkhla Hospital',
            id: 'songkhlaHospitalMSP',
            address: '123 Main St, City A',
        },
        {
            nameTH: 'โีรงพยาบาลสิงหนคร',
            nameEN: 'Singha Nakhon Hospital',
            id: 'singhanakohnHospitalMSP',
            address: '789 Oak St, City C',
        },
    ]

    const resultBytes = await contract.submitTransaction(
        'CreateMedicineRequest',
        JSON.stringify(asset),
        JSON.stringify(hospitalList)
    );

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    return result;
}

async function createSharingAsset(contract) {
    console.log(
        '\n--> Submit Transaction: CreateSharingAsset'
    );
    const sharingId = `SHAR-${now.toString()}`;
    const asset = {
        id: sharingId,
        postingHospitalId: hospitalEntities[0].id,
        postingHospitalNameEN: hospitalEntities[0].nameEN,
        postingHospitalNameTH: hospitalEntities[0].nameTH,
        postingHospitalAddress: hospitalEntities[0].address,
        status: 'in-progress',
        createdAt: now.toString(),
        updatedAt: now.toString(),
        sharingMedicine: {
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
        sharingReturnTerm: {
            expectedReturnDate: daysFromNow(10),
            receiveConditions: {
                exactType: false,
                subType: true,
                otherType: true,
                supportType: true,
                noReturn: true,
            }
        }
    }
    const hospitalList = [
        {
            nameTH: 'โีรงพยาบาลนาหม่อม',
            nameEN: 'Na Mom Hospital',
            id: 'namomHospitalMSP',
            address: '456 Elm St, City B',
        },
        {
            nameTH: 'โีรงพยาบาลสงขลา',
            nameEN: 'Songkhla Hospital',
            id: 'songkhlaHospitalMSP',
            address: '123 Main St, City A',
        },
        {
            nameTH: 'โีรงพยาบาลสิงหนคร',
            nameEN: 'Singha Nakhon Hospital',
            id: 'singhanakohnHospitalMSP',
            address: '789 Oak St, City C',
        },
    ]
    const resultBytes = await contract.submitTransaction(
        'CreateMedicineSharing',
        JSON.stringify(asset),
        JSON.stringify(hospitalList)
    );
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', result);
    return result;
}

async function updateResponseAsset(contract, assetId) {
    console.log(
        '\n--> Submit Transaction: UpdateResponseAsset, updates existing asset owner'
    );
    const responseAsset = {
        responseId: assetId,
        updatedAt: now.toString(),
        status: 'in-transfer', // Next is to transfer
        offeredMedicine: {
            name: 'Paracetamol',
            trademark: 'Adrenaline Injection',
            quantity: 100,
            pricePerUnit: 150,
            unit: '1mg/1ml',
            batchNumber: 'B12345',
            manufacturer: 'Pharma Inc.',
            manufactureDate: now.toString(),
            expiryDate: now.toString(),
            imageRef: 'base64encodedstring',
            returnTerm: {
                sameUnit: true,
                subsidiary: false,
                sameValue: false,
                other: false,
                notes: "please return the same unit"
            }
        },
    }
    const resultBytes = await contract.submitTransaction('CreateMedicineResponse', JSON.stringify(responseAsset));
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', result); 
    return result;
}

async function createTransferAsset(contract, assetId) {
    console.log(`\n--> Submit Transaction: TransferAsset`);
    const updatedAt = now.toString();
    const responseId = assetId;
    const resultBytes = await contract.submitTransaction('CreateMedicineTransfer', responseId, updatedAt);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', result);
    return result;
}

async function createReturnAsset(contract, assetId) {
    const returnData = {
        id: `RETR-${assetId}-${hospitalEntities[0].id}`,
        requestId: assetId,
        responseId: assetId,
        fromHospitalId: hospitalEntities[0].id,
        toHospitalId: hospitalEntities[1].id,
        returnMedicine: {
            name: 'test'
        }
    }
    const resultBytes = await contract.submitTransaction('CreateMedicineReturn', assetId, JSON.stringify(returnData));
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', result);
    return result;
}

async function readAssetByID(contract, assetId) {
    console.log(
        '\n--> Evaluate Transaction: ReadAsset, function returns asset attributes'
    );

    const resultBytes = await contract.evaluateTransaction(
        'ReadAssetById',
        assetId
    );

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

/**
 * submitTransaction() will throw an error containing details of any error responses from the smart contract.
 */
async function updateNonExistentAsset(contract) {
    console.log(
        '\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error'
    );

    try {
        await contract.submitTransaction(
            'UpdateAsset',
            'asset70',
            'blue',
            '5',
            'Tomoko',
            '300'
        );
        console.log('******** FAILED to return an error');
    } catch (error) {
        console.log('*** Successfully caught the error: \n', error);
    }
}

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters() {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}
