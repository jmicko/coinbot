import './Products.css'
import { useUser } from '../../../hooks/useUser.js';
import { useData } from '../../../hooks/useData.js';
import ProductTable from './ProductTable.js';
import { useEffect, useState } from 'react';
// import useLocalStorage from '../../../hooks/useLocalStorage.js';


function Products(props: { tips: boolean }) {
  const { theme } = useUser();
  const { products, refreshProducts } = useData();
  const [padNumbers, setPadNumbers] = useState(false);

  // const longestPriceDecimals = products?.allProducts?.reduce((acc, product) => {
  //   return Math.max(acc, Number(product.price).toString().split('.')[1]?.length || 0)
  // }, 0)
  console.log('rendering products');

  useEffect(() => {
    // refresh the products every 30 seconds
    const interval = setInterval(() => {
      console.log('refreshing products');

      refreshProducts();
    }, 30_000);
    return () => clearInterval(interval);

  }, [refreshProducts]);

  return (
    <div className="Products settings-panel scrollable thin-scroll">
      <div className={`divider ${theme}`} />

      {/* ACTIVE PRODUCTS */}

      <div className='products-header'>
      <h4>Currently Active ({products?.activeProducts?.length})</h4>
        <label
          className={`align-decimals ${theme}`}
          htmlFor="align-decimals"
        >
          <input
            name='align-decimals'
            id='align-decimals'
            type='checkbox'
            checked={padNumbers}
            onChange={() => setPadNumbers(!padNumbers)}
          />
          Align Decimals
        </label>
      </div>
      {props.tips && <p>
        These are all the trades you have currently set to trade.
        Deleting them will delete all active trades and stop the bot from trading them.
      </p>}
      <ProductTable key={"activeProducts"} parent={'activeProducts'} products={products.activeProducts} />

      <div className={`divider ${theme}`} />
      {/* AVAILABLE PRODUCTS */}
      <div className='products-header'>
        <h4>Available ({products?.allProducts?.length})</h4>
        {/* <label
          className={`align-decimals ${theme}`}
          htmlFor="align-decimals"
        >
          <input
            name='align-decimals'
            id='align-decimals'
            type='checkbox'
            checked={padNumbers}
            onChange={() => setPadNumbers(!padNumbers)}
          />
          Align Decimals
        </label> */}
      </div>
      {props.tips && <p>
        These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
        and will allow the bot to trade them.
      </p>}
      {/* table to display all products */}
      <ProductTable key={"allProducts"} parent={'allProducts'} products={products.allProducts} padNumbers={padNumbers} />
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Products;