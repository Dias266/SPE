
#!/bin/bash
#
# network.sh - Network Automation Script
# Universal Digital Identity Framework
#
# Usage: ./network.sh up|down|restart|createChannel|deployCC|clean
#

# Print the usage message
function printHelp() {
  echo "Usage: "
  echo "  network.sh <Mode> [Flags]"
  echo "    Modes:"
  echo "      up - Bring up the network with docker-compose"
  echo "      down - Clear the network with docker-compose down"
  echo "      restart - Restart the network"
  echo "      createChannel - Create and join a channel"
  echo "      deployCC - Deploy the chaincode"
  echo "      clean - Remove all containers, volumes, and generated files"
  echo
  echo "    Flags:"
  echo "    -c <channel name> - Channel name to use (default: 'mychannel')"
  echo "    -ccn <name> - Chaincode name (default: 'vehicle')"
  echo "    -ccv <version> - Chaincode version (default: '1.0')"
  echo "    -ccp <path> - Chaincode path (default: '../chaincode')"
  echo "    -d - Generate new crypto material"
  echo
  echo "  network.sh -h (print this message)"
  echo
  echo " Examples:"
  echo "  network.sh up"
  echo "  network.sh up -d"
  echo "  network.sh createChannel -c mychannel"
  echo "  network.sh deployCC -ccn vehicle -ccv 1.0"
  echo "  network.sh down"
}

# Defaults
CHANNEL_NAME="mychannel"
CC_NAME="vehicle"
CC_VERSION="1.0"
CC_SRC_PATH="../chaincode"
DELAY=3
MAX_RETRY=5
VERBOSE=false

# Parse commandline args
## Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi

# Parse flags
while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -ccn )
    CC_NAME="$2"
    shift
    ;;
  -ccv )
    CC_VERSION="$2"
    shift
    ;;
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -d )
    CRYPTO_MODE="generate"
    ;;
  -verbose )
    VERBOSE=true
    ;;
  * )
    echo "Unknown flag: $key"
    printHelp
    exit 1
    ;;
  esac
  shift
done

# Determine whether starting, stopping, restarting, or generating for announce
if [ "$MODE" == "up" ]; then
  EXPMODE="Starting"
elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "restart" ]; then
  EXPMODE="Restarting"
elif [ "$MODE" == "createChannel" ]; then
  EXPMODE="Creating channel"
elif [ "$MODE" == "deployCC" ]; then
  EXPMODE="Deploying chaincode"
else
  printHelp
  exit 1
fi

# Announce what was requested
echo "${EXPMODE} for channel '${CHANNEL_NAME}'"

# Function to create crypto material
function generateCryptoMaterial() {
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. Exiting"
    exit 1
  fi
  echo
  echo "##########################################################"
  echo "##### Generate certificates using cryptogen tool #########"
  echo "##########################################################"
  
  if [ -d "organizations/peerOrganizations" ]; then
    rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
  fi
  
  set -x
  cryptogen generate --config=./crypto-config.yaml --output="organizations"
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

# Function to generate genesis block and channel transaction
function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. Exiting"
    exit 1
  fi

  echo "##########################################################"
  echo "#########  Generating Channel Artifacts  ################"
  echo "##########################################################"
  
  echo "### Generating Genesis Block for channel '${CHANNEL_NAME}' ###"
  set -x
  configtxgen -profile TwoOrgsApplicationGenesis -outputBlock ./channel-artifacts/genesis.block -channelID system-channel
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    echo "Failed to generate genesis block..."
    exit 1
  fi
  echo
  
  echo "### Generating Channel Configuration Transaction '${CHANNEL_NAME}.tx' ###"
  set -x
  configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi
}

# Function to bring up the network
function networkUp() {
  
  # Check if crypto material exists
  if [ ! -d "organizations/peerOrganizations" ] || [ "$CRYPTO_MODE" == "generate" ]; then
    generateCryptoMaterial
  fi
  
  # Check if channel artifacts exist
  if [ ! -d "channel-artifacts" ]; then
    mkdir channel-artifacts
  fi
  
  if [ ! -f "./channel-artifacts/genesis.block" ]; then
    generateChannelArtifacts
  fi
  
  # Start containers
  COMPOSE_FILES="-f docker-compose.yml"
  
  IMAGE_TAG=2.5 docker-compose ${COMPOSE_FILES} up -d 2>&1
  
  docker ps -a
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi
  
  echo "Sleeping 10s to allow network to complete startup"
  sleep 10
}

# Function to bring down the network
function networkDown() {
  COMPOSE_FILES="-f docker-compose.yml"
  
  docker-compose ${COMPOSE_FILES} down --volumes --remove-orphans
  
  # Cleanup chaincode containers
  docker rm -f $(docker ps -aq --filter label=service=hyperledger-fabric) 2>/dev/null || true
  
  # Cleanup chaincode images
  docker rmi -f $(docker images -q --filter label=service=hyperledger-fabric) 2>/dev/null || true
  
  # Cleanup volumes
  docker volume prune -f 2>/dev/null || true
  
  echo "Network stopped and cleaned"
}

# Function to create channel
function createChannel() {
  scripts/createChannel.sh $CHANNEL_NAME $DELAY $MAX_RETRY $VERBOSE
  if [ $? -ne 0 ]; then
    echo "Error !!! Create channel failed"
    exit 1
  fi
}

# Function to deploy chaincode
function deployChaincode() {
  scripts/deployCC.sh $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CC_VERSION $DELAY $MAX_RETRY $VERBOSE
  if [ $? -ne 0 ]; then
    echo "Error !!! Deploy chaincode failed"
    exit 1
  fi
}

# Function to clean everything
function clean() {
  networkDown
  rm -rf organizations/peerOrganizations organizations/ordererOrganizations
  rm -rf channel-artifacts
  rm -rf ../organizations
  echo "Cleaned all generated files and containers"
}

# Execute based on mode
if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
elif [ "${MODE}" == "restart" ]; then
  networkDown
  networkUp
elif [ "${MODE}" == "createChannel" ]; then
  createChannel
elif [ "${MODE}" == "deployCC" ]; then
  deployChaincode
elif [ "${MODE}" == "clean" ]; then
  clean
else
  printHelp
  exit 1
fi

echo
echo "========================================="
echo "Network operation completed successfully"
echo "========================================="
echo
