export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/config

# Set DOCKER_SOCK
# docker context use default
export DOCKER_SOCK=/var/run/docker.sock
# export DOCKER_SOCK=/run/host-services/docker.sock

# Set Docker socket path for macOS
export DOCKER_HOST=unix:///var/run/docker.sock

# Generate crypto material
cryptogen generate --config=./config/crypto-config.yaml --output="organizations"

# Bring up network
docker compose -f compose/compose-test-net.yaml -f compose/docker/docker-compose-test-net.yaml up -d
docker ps -a

export FABRIC_CFG_PATH=${PWD}/configtx
configtxgen -profile ChannelUsingRaft -channelID main-channel -outputBlock ./channel-artifacts/genesis.block

export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
# Create channel genesis block

# Channel creation
osnadmin channel join --channelID main-channel --config-block channel-artifacts/genesis.block -o localhost:7053 --ca-file "$ORDERER_CA"  --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

# View detail channel status
osnadmin channel list --channelID main-channel -o localhost:7053 --ca-file "$ORDERER_CA"  --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

export FABRIC_CFG_PATH=${PWD}/config

# # Add organizations to the channel
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=hospitalaMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitala.example.com/users/Admin@hospitala.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer channel join -b ./channel-artifacts/genesis.block

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=hospitalbMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitalb.example.com/users/Admin@hospitalb.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b ./channel-artifacts/genesis.block

# add delay
sleep 5

# Set anchor peer
export CORE_PEER_LOCALMSPID=hospitalaMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitala.example.com/users/Admin@hospitala.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer channel fetch config channel-artifacts/config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c main-channel --tls --cafile "$ORDERER_CA"

cd channel-artifacts
configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json
jq '.data.data[0].payload.data.config' config_block.json > config.json
cp config.json config_copy.json
jq '.channel_group.groups.Application.groups.hospitalaMSP.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "peer0.hospitala.example.com","port": 7051}]},"version": "0"}}' config_copy.json > modified_config.json
configtxlator proto_encode --input config.json --type common.Config --output config.pb
configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
configtxlator compute_update --channel_id main-channel --original config.pb --updated modified_config.pb --output config_update.pb
configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"main-channel", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb

cd ..
peer channel update -f channel-artifacts/config_update_in_envelope.pb -c main-channel -o localhost:7050  --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA"

# Set anchor peer for hospitalb
export CORE_PEER_LOCALMSPID=hospitalbMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitalb.example.com/users/Admin@hospitalb.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel fetch config channel-artifacts/config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c main-channel --tls --cafile "$ORDERER_CA"

cd channel-artifacts
configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json
jq '.data.data[0].payload.data.config' config_block.json > config.json
cp config.json config_copy.json
jq '.channel_group.groups.Application.groups.hospitalbMSP.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "peer0.hospitalb.example.com","port": 9051}]},"version": "0"}}' config_copy.json > modified_config.json
configtxlator proto_encode --input config.json --type common.Config --output config.pb
configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
configtxlator compute_update --channel_id main-channel --original config.pb --updated modified_config.pb --output config_update.pb
configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"main-channel", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb

cd ..
peer channel update -f channel-artifacts/config_update_in_envelope.pb -c main-channel -o localhost:7050  --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA"

# Deploy chaincode
sleep 3
# package chaincode
echo "Packaging chaincode"
echo $(peer version)
# export FABRIC_CFG_PATH=../fabric-samples/config/
echo $FABRIC_CFG_PATH
# peer lifecycle chaincode package basic.tar.gz --path ../fabric-samples/asset-transfer-basic/chaincode-javascript/ --lang node --label basic_1.0
peer lifecycle chaincode package basic.tar.gz --path ./chaincode-javascript/ --lang node --label basic_1.0
# peer lifecycle chaincode package basic.tar.gz --path ${PWD}/asset-transfer-basic/chaincode-typescript/ --lang node --label basic_1.0
# peer lifecycle chaincode package basic.tar.gz --path ${PWD}/asset-transfer-basic/chaincode-go/ --lang golang --label basic_1.0

sleep 4
echo "Installing chaincode on hospitala" 
export CORE_PEER_LOCALMSPID="hospitalaMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitala.example.com/users/Admin@hospitala.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install basic.tar.gz

sleep 4
echo "Installing chaincode on hospitalb"
export CORE_PEER_LOCALMSPID="hospitalbMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitalb.example.com/users/Admin@hospitalb.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install basic.tar.gz

echo "Query chaincode package id"
peer lifecycle chaincode queryinstalled
export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "Package ID:" | sed -E 's/Package ID: (.*), Label:.*/\1/')
echo "CC_PACKAGE_ID: $CC_PACKAGE_ID"
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID main-channel --name basic --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# approve chaincode
echo "Approving chaincode on hospitala"
export CORE_PEER_LOCALMSPID="hospitalaMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitala.example.com/users/Admin@hospitala.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID main-channel --name basic --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

peer lifecycle chaincode checkcommitreadiness --channelID main-channel --name basic --version 1.0 --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --output json

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID main-channel --name basic --version 1.0 --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt"

peer lifecycle chaincode querycommitted --channelID main-channel --name basic

# peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C main-channel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt" -c '{"function":"InitMedicines","Args":[]}'
sleep 3
peer chaincode query -C main-channel -n basic -c '{"Args":["GetAllMedicines"]}'