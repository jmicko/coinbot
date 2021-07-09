import React, { Component } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
class Nav extends Component {
  render() {
    return (
      <div>
        <header className="App-header">
          <p>
            Coinbot
          </p>
        </header>
        <main>
          <p>
            Let's trade bitcoins!
          </p>
        </main>
      </div>
    );
  }
}

export default connect(mapStoreToProps)(Nav);
