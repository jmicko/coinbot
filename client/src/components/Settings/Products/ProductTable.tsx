import { numberWithCommas } from '../../../shared.js';
import './Products.css'
// import { useUser } from '../../../contexts/useUser.js';
import { useData } from '../../../contexts/useData.js';
import usePutFetch from '../../../hooks/usePutFetch.js';
import { useMemo } from 'react';

interface ProductsProps {
  active_for_user: boolean;
  product_id: string;
  price: string;
  volume_24h: string;
  average: string;
  quote_currency_id: string;
  price_percentage_change_24h: string;
  base_currency_id: string;
  quote_increment: string;
  volume_in_quote?: string;
}

function ProductTable(props: { products: ProductsProps[], parent: string }) {
  // const { theme } = useUser();
  const { refreshProducts } = useData();

  const products = props.products;

  const { putData: toggleActiveProduct } = usePutFetch({
    url: '/api/account/products',
    from: 'products in data context',
    refreshCallback: refreshProducts,
  })

  const longestPriceDecimals = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, Number(product.price).toString().split('.')[1]?.length || 0)
    }, 0)
  }, [products])

  const longestVolumeDec = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, Number(product.volume_in_quote).toString().split('.')[1]?.length || 0)
    }, 0)
  }, [products])
  console.log(longestVolumeDec, '< longestVolumeDec');


  const longestProductBase = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, product.base_currency_id.length)
    }, 0)
  }, [products])

  const longestProductQuote = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, product.quote_currency_id.length)
    }, 0)
  }, [products])

  return (

    <table className='product-table'>
      <thead>
        <tr>
          <th>Active</th>
          <th className='table-product-id'>Product ID</th>
          <th>Price</th>
          {/* <th>Volume 24h</th> */}
          {products[0]?.average && <th>6h avg variance</th>}
          {/* && <th>6h avg variance</th>} */}
          <th>Volume 24h In Quote</th>
          <th>Price % Change 24h</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {

          const decimalPadding = longestPriceDecimals - Number(product.price).toString().split('.')[1]?.length || 0;
          const volumePadding = longestVolumeDec - Number(product.volume_in_quote).toString().split('.')[1]?.length || 0;
          // console.log(decimalPadding, '< decimalPadding', longestVolumeDec, '< longestVolumeDec', Number(product.volume_in_quote).toString().split('.')[1]?.length, '< Number(product.volume_in_quote).toString().split(\'.\')[1]?.length');


          const productPaddingBase = longestProductBase - product.base_currency_id.length > 0 ? longestProductBase - product.base_currency_id.length : 0;
          const productPaddingQuote = longestProductQuote - product.quote_currency_id.length > 0 ? longestProductQuote - product.quote_currency_id.length : 0;
          // console.log(product, '< product');

          return (
            <tr key={product.product_id}>
              <td className='table-active'>
                <input
                  type="checkbox"
                  checked={product.active_for_user}
                  onChange={() => toggleActiveProduct(product)}
                />
              </td>
              <td className='table-product-id'>
                {'\u00A0'.repeat(productPaddingBase)}{product.product_id}{'\u00A0'.repeat(productPaddingQuote)}
              </td>
              <td className='number table-price'>
                {numberWithCommas(Number(product.price))}{'\u00A0'.repeat(decimalPadding)}
              </td>
              {products[0]?.average && <td className='table-average number'>
                {numberWithCommas(Number(product.average).toFixed(8))}
              </td>}
              <td className='number table-volume'>
                {numberWithCommas((Number(product.volume_in_quote)))}
                {'\u00A0'.repeat(volumePadding + 1)}{product.quote_currency_id}
              </td>
              <td className='number table-price-percentage-change'>
                {product.price_percentage_change_24h}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  );
}

export default ProductTable;