import { combineReducers } from 'redux';


const xlsxReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_XLSX':
      return action.payload;
    case 'UNSET_XLSX':
      return [];
    default:
      return state;
  }
};

const currentJSONReducer = (state = false, action) => {
  switch (action.type) {
    case 'SET_CURRENT_JSON':
      return action.payload;
    case 'UNSET_CURRENT_JSON':
      return false;
    default:
      return state;
  }
};

const botMessages = (state = [], action) => {
  switch (action.type) {
    case 'CLEAR_BOT_MESSAGES':
      return [];
    case 'SET_BOT_MESSAGES':
      return action.payload;
    default:
      return state;
  }
};

const chatMessages = (state = [], action) => {
  switch (action.type) {
    case 'CLEAR_CHAT_MESSAGES':
      return [];
    case 'SET_CHAT_MESSAGES':
      return action.payload;
    default:
      return state;
  }
};


// store the results of the simulation
const simulationReducer = (state = { status: 'idle' }, action) => {
  switch (action.type) {
    case 'SET_SIMULATION_RESULT':
      // only set the result if the simulation is still running
      // this prevents race conditions between the socket and REST calls
      if (state.status === 'running') {
        return { status: 'complete', result: action.payload}
      } else {
        return state;
      }
    case 'UNSET_SIMULATION_RESULT':
      return { status: 'idle' };
    case 'SET_SIMULATION_RUNNING':
      return { status: 'running' };
    default:
      return state;
  }
};


export default combineReducers({
  xlsxReducer,
  currentJSONReducer,
  botMessages,
  chatMessages,
  simulationReducer,
});
