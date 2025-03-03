#!/bin/bash

# Generate crypto material
cryptogen generate --config=./config/crypto-config.yaml

# # Create channel artifacts directory
# mkdir channel-artifacts

# # Generate genesis block
# configtxgen -profile ChannelUsingRaft -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# # Generate channel configuration transaction
# configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel

# # Generate anchor peer transactions
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP