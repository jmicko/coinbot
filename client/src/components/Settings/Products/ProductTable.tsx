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
          console.log(volumeInQuoteCommas, '< volumeInQuoteCommas');
          // split at the first comma
          const volumeInQuoteSplit = numberWithCommas(Number(product.volume_in_quote).toFixed(0)).split(',')[0];
          // pick which letter to use based on the number of commas. if there are no commas, use the whole number
          const volumeInQuoteShortened = volumeInQuoteCommas === 0
            ? volumeInQuoteSplit
            : volumeInQuoteCommas === 1
              ? volumeInQuoteSplit + 'k'
              : volumeInQuoteCommas === 2
                ? volumeInQuoteSplit + 'm'
                : volumeInQuoteCommas === 3
                  ? volumeInQuoteSplit + 'b'
                  : volumeInQuoteCommas === 4
                    ? volumeInQuoteSplit + 't'
                    : volumeInQuoteCommas === 5
                      ? volumeInQuoteSplit + 'q'
                      // yo dawg
                      : volumeInQuoteCommas === 6
                        ? volumeInQuoteSplit + 'Q'
                        : volumeInQuoteCommas === 7
                          ? volumeInQuoteSplit + 's'
                          : volumeInQuoteCommas === 8
                            ? volumeInQuoteSplit + 'S'
                            : volumeInQuoteCommas === 9
                              ? volumeInQuoteSplit + 'o'
                              : volumeInQuoteCommas === 10
                                ? volumeInQuoteSplit + 'n'
                                : volumeInQuoteCommas === 11
                                  ? volumeInQuoteSplit + 'd'
                                  // I heard you like ternaries
                                  : volumeInQuoteCommas === 12
                                    ? volumeInQuoteSplit + 'U'
                                    : volumeInQuoteCommas === 13
                                      ? volumeInQuoteSplit + 'D'
                                      : volumeInQuoteCommas === 14
                                        ? volumeInQuoteSplit + 'T'
                                        : volumeInQuoteCommas === 15
                                          ? volumeInQuoteSplit + 'q'
                                          : volumeInQuoteCommas === 16
                                            ? volumeInQuoteSplit + 'Q'
                                            : volumeInQuoteCommas === 17
                                              ? volumeInQuoteSplit + 's'
                                              : volumeInQuoteCommas === 18
                                                ? volumeInQuoteSplit + 'S'
                                                // So I put a ternary in your ternary
                                                : volumeInQuoteCommas === 19
                                                  ? volumeInQuoteSplit + 'o'
                                                  // So you can ternary
                                                  : volumeInQuoteCommas === 20
                                                    ? volumeInQuoteSplit + 'n'
                                                    // or you can ternary
                                                    : volumeInQuoteCommas === 21
                                                      ? volumeInQuoteSplit + 'd'
                                                      // or you can ternary
                                                      : volumeInQuoteCommas === 22
                                                        ? volumeInQuoteSplit + 'U'
                                                        // or you can ternary
                                                        : volumeInQuoteCommas === 23
                                                          ? volumeInQuoteSplit + 'D'
                                                          // or you can ternary
                                                          : volumeInQuoteCommas === 24
                                                            ? volumeInQuoteSplit + 'T'
                                                            // or you can ternary
                                                            : volumeInQuoteCommas === 25
                                                              ? volumeInQuoteSplit + 'q'
                                                              // or you can ternary
                                                              : volumeInQuoteCommas === 26
                                                                ? volumeInQuoteSplit + 'Q'
                                                                // or you can ternary
                                                                : volumeInQuoteCommas === 27
                                                                  ? volumeInQuoteSplit + 's'
                                                                  : 'ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha ha'
          // none of the letters after the t were checked by a human as lining up with real numbers


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