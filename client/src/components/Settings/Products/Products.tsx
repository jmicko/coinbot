import { numberWithCommas } from '../../../shared.js';
import './Products.css'
import { useUser } from '../../../contexts/useUser.js';
import { useData } from '../../../contexts/useData.js';
import usePutFetch from '../../../hooks/usePutFetch.js';


function Products(props: { tips: boolean }) {
  const { theme } = useUser();
  const { refreshProducts, products } = useData();

  // function toggleActive(product) {
  //   console.log('toggleActive?', product);
  //   toggleActiveProduct(product);
  // }

  const { putData: toggleActiveProduct } = usePutFetch({
    url: '/api/account/products',
    from: 'products in data context',
    refreshCallback: refreshProducts,
  })

  return (
    <div className="Products settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* ACTIVE PRODUCTS */}
      <h4>Currently Active ({products?.activeProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades you have currently set to trade.
        Deleting them will delete all active trades and stop the bot from trading them.
      </p>}
      <table className='product-table'>
        <thead>
          <tr>
            <th>Active</th>
            <th>Product ID</th>
            <th>Price</th>
            {/* <th>Volume 24h</th> */}
            <th>6h avg variance</th>
            <th>Volume 24h In Quote</th>
            <th>Price % Change 24h</th>
          </tr>
        </thead>
        <tbody>
          {products.activeProducts
            ? products.activeProducts.map((product, i) => {
              return (
                <tr key={i}>
                  <td>
                    <center>
                      <input
                        type="checkbox"
                        checked={product.active_for_user}
                        onChange={() => toggleActiveProduct(product )}
                      />
                    </center>
                  </td>
                  <td>
                    <center>
                      {product.product_id}
                    </center>
                  </td>
                  <td>
                    <center>
                      {numberWithCommas(Number(product.price))}
                    </center>
                  </td>
                  <td>
                    <center>
                      {/* {numberWithCommas(Number(product.volume_24h).toFixed(Number(product.quote_increment).toString().length - 2))} */}
                      {numberWithCommas(Number(product.average).toFixed(8))}
                    </center>
                  </td>
                  <td>
                    <center>
                      {numberWithCommas((Number(product.volume_24h) * Number(product.price)).toFixed(Number(product.quote_increment).toString().length - 2))} {product.quote_currency_id}
                    </center>
                  </td>
                  <td>
                    <center>
                      {product.price_percentage_change_24h}
                    </center>
                  </td>
                </tr>
              )
            }
            )
            : <p>No active products</p>
          }
        </tbody>
      </table>
      <div className={`divider ${theme}`} />
      {/* AVAILABLE PRODUCTS */}
      <h4>Available ({products?.allProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
        and will allow the bot to trade them.
      </p>}
      {/* table to display all products */}
      <table className='product-table'>
        <thead>
          <tr>
            <th>Active</th>
            <th>Product ID</th>
            <th>Price</th>
            {/* <th>Volume 24h</th> */}
            <th>Volume 24h In Quote</th>
            <th>Price % Change 24h</th>
          </tr>
        </thead>
        <tbody>
          {products.allProducts
            ? products.allProducts.map((product, i) => {
              return (
                <tr key={i}>
                  <td>
                    <input
                      type="checkbox"
                      checked={product.active_for_user}
                      onChange={() => toggleActiveProduct( product )}
                    />
                  </td>
                  <td>
                    {product.product_id}
                  </td>
                  <td className='number'>
                    {numberWithCommas(Number(product.price))}
                  </td>
                  <td className='number'>
                    {numberWithCommas((Number(product.volume_24h) * Number(product.price)).toFixed(2))} {product.quote_currency_id}
                  </td>
                  <td className='number'>
                    {product.price_percentage_change_24h}
                  </td>
                </tr>
              )
            }
            )
            : <p>No available products</p>
          }
        </tbody>
      </table>
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Products;