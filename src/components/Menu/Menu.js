import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Menu.css'

function Menu(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const products = useSelector((store) => store.accountReducer.productsReducer);

  return (

    <div className={`Menu dark ${user.theme}`}>
      <center>
        <p className="greeting">Hello {user.username}!</p>
      </center>
      <div className="menu-buttons">
        {/* only show Test button in dev mode */}
        {process.env.NODE_ENV === 'development' && user.admin && <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => dispatch({ type: 'TEST' })}>Test</button>}
        {/* add dropdown selector */}
        <select
          onChange={(event) => props.setProduct(event.target.value)}
        >
          {/* each active product in products should be listed as an option with the value equal to the product_id */}
          {products?.activeProducts?.map((product, i) => {
            return (
              <option key={i} value={product.product_id}>{product.product_id}</option>
            )
          })}
        </select>
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
      </div>
    </div>

  )
}

export default Menu;