import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Products.css'


function Products(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const products = useSelector((store) => store.accountReducer.productsReducer);

  const [max_trade_load, setMaxTradeLoad] = useState(100);
  const [profit_accuracy, setProfit_accuracy] = useState(2);


  function toggleActive(event) {
    dispatch({
      type: 'SET_PROFIT_ACCURACY',
      payload: {
        profit_accuracy: profit_accuracy
      }
    });
  }

  // function to dispatch to get all products
  function getProducts() {
    dispatch({
      type: 'FETCH_PRODUCTS',
    });
  }

  // // get products on component load
  // useEffect(() => {
  //   getProducts();
  // }, []);



  return (
    <div className="Products settings-panel scrollable">
      <div className="divider" />

      {/* ACTIVE PRODUCTS */}
      <h4>Currently Active</h4>
      {props.tips && <p>
        These are all the trades you have currently set to trade.
        Deleting them will delete all active trades and stop the bot from trading them.
      </p>}
      {/* {JSON.stringify(products.activeProducts)} */}
      {products.activeProducts
        ? products.activeProducts.map((product, i) => {
          return (
            <div key={i}>
              <p>{product.product_id}</p>
            </div>
          )
        }
        )
        : <p>No active products</p>
      }
      <div className="divider" />
      {/* AVAILABLE PRODUCTS */}
      <h4>Available</h4>
      {props.tips && <p>
        These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
        and will allow the bot to trade them.
      </p>}
      {products.allProducts
        ? products.allProducts.map((product, i) => {
          return (
            <div key={i}>
              <p>{product.product_id}</p>
            </div>
          )
        }
        )
        : <p>No available products</p>
      }
      <div className="divider" />
    </div>
  );
}

export default Products;