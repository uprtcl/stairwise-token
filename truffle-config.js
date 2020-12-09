require("dotenv").config();
const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    rinkeby: {
      provider: () => {
        return new HDWalletProvider(
          process.env.mnemonic,
          process.env.endpointRK
        );
      },
      gasPrice: 25000000000,
      network_id: 4,
    },
    mainnet: {
      provider: () => {
        return new HDWalletProvider(
          process.env.mnemonic,
          process.env.endpointMN
        );
      },
      gas: 200000,
      gasPrice: 200000000000,
      network_id: 1,
    },
  },

  compilers: {
    solc: {
      version: "^0.6.0",
      settings: {
        optimizer: {
          enabled: false,
        },
      },
    },
  },
  //
};
