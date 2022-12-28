import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { numberWithCommas } from '../../../shared';
import './Products.css'


function Products(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const products = useSelector((store) => store.accountReducer.productsReducer);

  const [max_trade_load, setMaxTradeLoad] = useState(100);
  const [profit_accuracy, setProfit_accuracy] = useState(2);


  function toggleActive(product) {
    console.log('toggleActive?', product);
    dispatch({
      type: 'TOGGLE_ACTIVE_PRODUCT',
      payload: product,
    });
  }

  return (
    <div className="Products settings-panel scrollable">
      <div className="divider" />

      {/* ACTIVE PRODUCTS */}
      <h4>Currently Active ({products?.activeProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades you have currently set to trade.
        Deleting them will delete all active trades and stop the bot from trading them.
      </p>}
      <table>
        <thead>
          <tr>
            <th>Active</th>
            <th>Product ID</th>
            <th>Price</th>
            <th>Volume 24h</th>
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
                        onChange={() => toggleActive(product)}
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
                      {numberWithCommas(Number(product.volume_24h).toFixed(Number(product.quote_increment).toString().length - 2))}
                    </center>
                  </td>
                  <td>
                    <center>
                      {numberWithCommas(Number(product.volume_24h * product.price).toFixed(Number(product.quote_increment).toString().length - 2))} {product.quote_currency_id}
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
      <div className="divider" />
      {/* AVAILABLE PRODUCTS */}
      <h4>Available ({products?.allProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
        and will allow the bot to trade them.
      </p>}
      {/* table to display all products */}
      <table>
        <thead>
          <tr>
            <th>Active</th>
            <th>Product ID</th>
            <th>Price</th>
            <th>Volume 24h</th>
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
                    <center>
                      <input
                        type="checkbox"
                        checked={product.active_for_user}
                        onChange={() => toggleActive(product)}
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
                      {numberWithCommas(Number(product.volume_24h).toFixed(Number(product.quote_increment).toString().length - 2))}
                    </center>
                  </td>
                  <td>
                    <center>
                      {numberWithCommas(Number(product.volume_24h * product.price).toFixed(Number(product.quote_increment).toString().length - 2))} {product.quote_currency_id}
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
            : <p>No available products</p>
          }
        </tbody>
      </table>
      <div className="divider" />
    </div>
  );
}

export default Products;