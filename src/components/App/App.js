import React, { useEffect } from 'react';
import './App.css';
import {
  HashRouter as Router,
  Route,
  Switch,
  // Redirect,
} from 'react-router-dom';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';

function App(props) {
  const dispatch = useDispatch();


  useEffect(() => {
    dispatch({ type: 'FETCH_USER' });
    return
  }, [dispatch])




  return (
    <div className={`App darkTheme`}>
      <Router>
        <Switch>
          <Route
            exact path="/"
            component={props.store.accountReducer.userReducer.id
              ? Home
              : Login}
          />
          <Route
            exact path="/login"
            component={Login} />
        </Switch>
      </Router>
    </div>
  );
}

export default connect(mapStoreToProps)(App);
