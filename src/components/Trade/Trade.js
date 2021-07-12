import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
class Trade extends Component {
  state = {
    heading: 'Trade Component',
  };

  sagaTest = (event) => {
    this.props.dispatch({
      type: 'TEST_SAGA',
    });
  }

  render() {
    return (
      <div>
        <h2>{this.state.heading}</h2>
        <p>
          {JSON.stringify(this.props)}
        </p>
        <Link to="/">
          home
        </Link>
        {/* <div>
          <button
            onClick={() => { this.props.dispatch({ type: 'RETURN_TEST_1' }); }}>
            test 1 reducer
          </button>
          <button
            onClick={() => { this.props.dispatch({ type: 'RETURN_TEST_2' }); }}>
            test 2 reducer
          </button>
          <button
            onClick={() => { this.props.dispatch({ type: 'TEST_SAGA' }); }}>
            test saga
          </button>
          <button
            onClick={() => { this.props.dispatch({ type: 'TEST_SERVER' }); }}>
            test server
          </button>
        </div> */}
        <div>
          <button
            onClick={() => { this.props.dispatch({ type: 'BUY_BTC' }); }}>
            test buy
          </button>
          <button
          onClick={() => {this.props.dispatch({ type: 'SELL_BTC' }); }}>
            test sell
          </button>
          <button
          onClick={() => {this.props.dispatch({ type: 'START_TRADE' }); }}>
            start trade
          </button>
        </div>
      </div>
    );
  }
}

// change this line later when adding redux to --> connect(mapStoreToProps)(Trade)

export default connect(mapStoreToProps)(Trade);
