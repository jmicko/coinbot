import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../contexts/UserContext';
import './Menu.css'

function Menu(props) {
  const dispatch = useDispatch();
  const products = useSelector((store) => store.accountReducer.productsReducer);
  const { logout, user } = useUser();

  function handleLogout() {
    // dispatch({ type: 'LOGOUT' })
    logout();
  }

  
  // if products.activeProducts changes, the selected product will be set to the first product in the list
  useEffect(() => {
    props.setProduct(products?.activeProducts?.[0]?.product_id);
  }, [products.activeProducts])
  
  return (
    // render the menu if there are active products
    // products.activeProducts 

    <div className={`Menu dark ${user.theme}`}>
      <center>
        <p className="greeting">{user.username}
        &nbsp;
        <select
          onChange={(event) => props.setProduct(event.target.value)}
          value={props.product}
          >
          {/* each active product in products should be listed as an option with the value equal to the product_id */}
          {products?.activeProducts?.map((product, i) => {
            return (
              <option key={i} value={product.product_id}>{product.product_id}</option>
              )
            })}
        </select>
            </p>
      </center>
      {/* {JSON.stringify(products.activeProducts)} */}
      <div className="menu-buttons">
        {/* only show Test button in dev mode */}
        {process.env.NODE_ENV === 'development' && user.admin && <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => dispatch({ type: 'TEST' })}>Test</button>}
        {/* add dropdown selector */}
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={handleLogout}>Log Out</button>
      </div>
    </div>

  )
}

export default Menu;