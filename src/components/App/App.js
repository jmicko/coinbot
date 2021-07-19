import './App.css';
import {
  HashRouter as Router,
  Route,
  // Redirect,
  // Switch,
} from 'react-router-dom';
import { connect } from 'react-redux';

// Directory imports
import Trade from '../Trade/Trade';
import Home from '../Home/Home';

function App() {
  return (
    <div className="App">
      {/* <Nav /> */}
      <Router>
          <Route 
          exact path="/trade" 
          component={Trade} />
          <Route 
          exact path="/" 
          component={Home} />
        </Router>
    </div>
  );
}

export default connect()(App);
