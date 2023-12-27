import { useData } from '../../contexts/useData.js';
import { useUser } from '../../contexts/useUser.js';
import useGetFetch from '../../hooks/useGetFetch.js';
import './Menu.css'

interface Product {
  product_id: string;
}

function Menu() {
  const { logout, user, theme, btnColor } = useUser();
  const { productID, setProductID, products, showSettings, setShowSettings } = useData();

  const { refresh: refreshTestData }
    = useGetFetch('/api/settings/test/cheese', {
      defaultState: {},
      preload: false,
      from: 'refreshTestData in Menu'
    })

  return (
    <div className={`Menu dark ${theme}`}>
      <center>
        {
          products.activeProducts &&
          <p className="greeting">{user.username}
            &nbsp;
            <select
              className={`select-product ${theme}`}
              id='productID-select'
              onChange={(event) => {
                setProductID(event.target.value)
              }}
              value={productID || ''}
            >
              {/* each active product in products should be listed as an option with the value equal to the product_id */}
              {products?.activeProducts?.map((product: Product, i: number) => {
                return (
                  <option key={i} value={product.product_id}>{product.product_id}</option>
                )
              })}
            </select>
          </p>
        }
      </center>
      <div className="menu-buttons">
        {/* only show Test button in dev mode */}
        {process.env.NODE_ENV === 'development' && user?.admin && <button
          className={`${btnColor} btn-logout ${theme}`}
          onClick={refreshTestData}>Test</button>}
        {/* control buttons */}
        <button
          className={`${btnColor} btn-logout ${theme}`}
          onClick={() => { setShowSettings(!showSettings) }}
        >
          Settings
        </button>
        <button
          className={`${btnColor} btn-logout ${theme}`}
          onClick={() => { logout() }}
        >
          Log Out
        </button>
      </div>
    </div>

  )
}

export default Menu;