/**
 * @typedef {object} FirstTimeState
 * @property {object} config Initial configuration parameters
 * @property {object} NetworkController Network controller state
 */

/**
 * @type {FirstTimeState}
 */

const rpc = require('../../initialRpc.json');

const initialState = {
  config: {},
  PreferencesController: {
    frequentRpcListDetail: [
      ...(rpc || []).reverse(),
      {
        rpcUrl: 'http://localhost:8545',
        chainId: '0x539',
        ticker: 'ETH',
        nickname: 'Localhost 8545',
        rpcPrefs: {},
      },
    ],
  },
};

export default initialState;
