docker stop peer0.hospitalb.example.com orderer.example.com peer0.hospitala.example.com
docker rm peer0.hospitalb.example.com orderer.example.com peer0.hospitala.example.com

rm -rf organizations channel-artifacts

# Should delete the volumes as well, but this is a test network
# so we don't care about the data
docker volume prune -f