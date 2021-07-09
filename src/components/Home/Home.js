import React, { Component } from 'react';
import { Link } from 'react-router-dom';
// import { connect } from 'react-redux';
// import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
class Home extends Component {
  state = {
    heading: 'Home Component',
  };

  render() {
    return (
      <div>
        <h2>{this.state.heading}</h2>
        <Link to="trade">
          trade
        </Link>
      </div>
    );
  }
}

export default Home;
