import { numberWithCommas } from '../../../shared.js';
import './Products.css'
// import { useUser } from '../../../contexts/useUser.js';
import { useData } from '../../../hooks/useData.js';
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
  pqd: number;
}

function ProductTable(props: { products: ProductsProps[], parent: string, padNumbers?: boolean }) {
  // const { theme } = useUser();
  const { refreshProducts, currentProduct } = useData();

  const products = props.products;

  const { putData: toggleActiveProduct } = usePutFetch({
    url: '/api/account/products',
    from: 'products in data context',
    refreshCallback: refreshProducts,
  })

  const longestPriceDecimals = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, Number(product.price).toFixed(product.pqd).split('.')[1]?.length || 0)
    }, 0)
  }, [products])

  // const longestVolumeDec = useMemo(() => {
  //   return products.reduce((acc, product) => {
  //     return Math.max(acc, Number(product.volume_in_quote).toFixed(product.pqd).split('.')[1]?.length || 0)
  //   }, 0)
  // }, [products])
  // console.log(longestVolumeDec, '< longestVolumeDec');


  const longestProductBase = useMemo(() => {
    return products.reduce((acc, product) => {
      return Math.max(acc, product.base_currency_id.length)
    }, 0)
  }, [products])

  // const longestProductQuote = useMemo(() => {
  //   return products.reduce((acc, product) => {
  //     return Math.max(acc, product.quote_currency_id.length)
  //   }, 0)
  // }, [products])

  return (

    <table className='product-table'>
      <thead>
        <tr>
          <th>Active</th>
          {/* <th className='table-product-id'>Asset</th> */}
          <th>Price</th>
          {/* <th>Volume 24h</th> */}
          {products[0]?.average && <th>6h avg<br />variance</th>}
          {/* && <th>6h avg variance</th>} */}
          <th>
            Vol 24h
            <br />
            In {currentProduct.quote_currency_id}
          </th>
          <th>24h $<br />Change</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {

          const decimalPadding = longestPriceDecimals - (Number(product.price).toFixed(product.pqd).split('.')[1]?.length || -1);
          // const volumePadding = longestVolumeDec - (Number(product.volume_in_quote).toFixed(product.pqd).split('.')[1]?.length || -1);
          // shorten volume in quote to b, m, k for billions, millions, thousands
          // count the number of commas
          const volumeInQuoteCommas = numberWithCommas(Number(product.volume_in_quote).toFixed(0)).split('').filter(char => char === ',').length;
          // console.log(volumeInQuoteCommas, '< volumeInQuoteCommas');
          // split at the first comma
          const volumeInQuoteSplit = numberWithCommas(Number(product.volume_in_quote).toFixed(0)).split(',')[0];
          // pick which letter to use based on the number of commas. if there are no commas, use the whole number
          const volumeSuffixes: { [key: number]: string } = {
            0: '',
            1: 'k',
            2: 'm',
            3: 'b',
            4: 't',
            5: 'q',
            6: 'Q',
            7: 's',
            8: 'S',
            9: 'o',
            10: 'n',
            11: 'd',
            12: 'U',
            13: 'D',
            14: 'T'
            // okay look kid, I don't think coinbase is ever going to support anything past 14 commas.
          };

          const volumeInQuoteShortened = volumeInQuoteSplit + volumeSuffixes[volumeInQuoteCommas] || '';

          const productPaddingBase = longestProductBase - product.base_currency_id.length > 0 ? longestProductBase - product.base_currency_id.length : 0;
          // const productPaddingQuote = longestProductQuote - product.quote_currency_id.length > 0 ? longestProductQuote - product.quote_currency_id.length : 0;
          // console.log(product, '< product');

          return (
            <tr key={product.product_id}>
              {/* DE/ACTIVATE PRODUCT */}
              <td className='table-active table-product-id'>
                <input
                  type="checkbox"
                  name='active'
                  checked={product.active_for_user}
                  onChange={() => toggleActiveProduct(product)}
                />
                {/* </td> */}
                {/* PRODUCT ID */}
                {/* <td className='table-product-id'> */}
                {/* {'\u00A0'.repeat(productPaddingQuote)} */}
                &nbsp;{product.base_currency_id}{'\u00A0'.repeat(productPaddingBase)}
              </td>
              {/* PRICE */}
              <td className='number table-price'>
                {numberWithCommas(Number(product.price).toFixed(product.pqd))}{props.padNumbers && '\u00A0'.repeat(decimalPadding)}
              </td>
              {/* 6 HOUR AVERAGE VARIANCE */}
              {products[0]?.average &&
                <td className='table-average number'>
                  {numberWithCommas(Number(product.average).toFixed(4))}
                </td>}
              {/* VOLUME 24H */}
              <td className='number table-volume'>
                {props.padNumbers
                  ? numberWithCommas((Number(product.volume_in_quote).toFixed(0)))
                  : volumeInQuoteShortened}
                {/* {props.padNumbers && '\u00A0'.repeat(volumePadding + 1)} */}
                {/* {product.quote_currency_id} */}
              </td>
              {/* PRICE % CHANGE 24H */}
              <td className='number table-price-percentage-change'>
                {Number(product.price_percentage_change_24h).toFixed(2)}%
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  );
}

export default ProductTable;