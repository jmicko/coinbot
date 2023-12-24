import './Products.css'
import { useUser } from '../../../contexts/useUser.js';
import { useData } from '../../../contexts/useData.js';
import ProductTable from './ProductTable.js';
import { useEffect } from 'react';


function Products(props: { tips: boolean }) {
  const { theme } = useUser();
  const { products, refreshProducts } = useData();

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
    <div className="Products settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* ACTIVE PRODUCTS */}
      <h4>Currently Active ({products?.activeProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades you have currently set to trade.
        Deleting them will delete all active trades and stop the bot from trading them.
      </p>}
      <ProductTable key={"activeProducts"} parent={'activeProducts'} products={products.activeProducts} />

      <div className={`divider ${theme}`} />
      {/* AVAILABLE PRODUCTS */}
      <h4>Available ({products?.allProducts?.length})</h4>
      {props.tips && <p>
        These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
        and will allow the bot to trade them.
      </p>}
      {/* table to display all products */}
      <ProductTable key={"allProducts"} parent={'allProducts'} products={products.allProducts} />
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Products;