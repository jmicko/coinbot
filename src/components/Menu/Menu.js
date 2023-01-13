import React from 'react';
import { useData } from '../../contexts/DataContext.js';
import { useUser } from '../../contexts/UserContext.js';
import { useFetchData } from '../../hooks/fetchData.js';
import './Menu.css'

function Menu(props) {
  const { logout, user } = useUser();
  const { productID, setProductID, products } = useData();
  const { refresh: refreshTestData } = useFetchData('/api/settings/test/cheese', { defaultState: {}, noLoad: true })

  return (
    <div className={`Menu dark ${user.theme}`}>
      <center>
        {products.activeProducts && <p className="greeting">{user.username}
          &nbsp;
          <select
            onChange={(event) => {
              // props.setProduct(event.target.value);
              setProductID(event.target.value)
            }}
            value={productID || ''}
          >
            {/* each active product in products should be listed as an option with the value equal to the product_id */}
            {products?.activeProducts?.map((product, i) => {
              return (
                <option key={i} value={product.product_id}>{product.product_id}</option>
              )
            })}
          </select>
        </p>}
      </center>
      <div className="menu-buttons">
        {/* only show Test button in dev mode */}
        {process.env.NODE_ENV === 'development' && user.admin && <button 
        className={`btn-blue btn-logout ${user.theme}`} 
        onClick={refreshTestData}>Test</button>}
        {/* control buttons */}
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={logout}>Log Out</button>
      </div>
    </div>

  )
}

export default Menu;