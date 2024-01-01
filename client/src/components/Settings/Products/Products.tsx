import './Products.css'
import { useUser } from '../../../hooks/useUser.js';
import { useData } from '../../../hooks/useData.js';
import ProductTable from './ProductTable.js';
import { useEffect, useMemo, useState } from 'react';
import Collapser from '../../Collapser/Collapser.js';
import useGetFetch from '../../../hooks/useGetFetch.js';
import usePutFetch from '../../../hooks/usePutFetch.js';
import useDownloadFile from '../../../hooks/useDownloadFile.js';
import { granularities } from '../../../shared.js';
// import useLocalStorage from '../../../hooks/useLocalStorage.js';


function Products(props: { tips: boolean }) {
  const { user, refreshUser, theme } = useUser();
  const { products, productID, refreshProducts } = useData();
  const [padNumbers, setPadNumbers] = useState(false);

  // const longestPriceDecimals = products?.allProducts?.reduce((acc, product) => {
  //   return Math.max(acc, Number(product.price).toString().split('.')[1]?.length || 0)
  // }, 0)
  // console.log('rendering products');


  const { downloadFile } = useDownloadFile({
    url: `/api/account/downloadFile`,
    from: 'downloadFile in History'
  })

  const exportableFilesOptions = useMemo(() => ({
    url: `/api/account/exportableFiles`,
    defaultState: [],
    from: 'exportableFiles in History',
    preload: true,
  }), []);
  const {
    data: exportableFiles,
    refresh: refreshExportableFiles,
  } = useGetFetch(exportableFilesOptions)

  const { putData: generateCandleFile } = usePutFetch({
    url: `/api/account/exportCandles`,
    refreshCallback: refreshExportableFiles,
    from: 'generateCandleFile in History',
  })

  async function exportCandleXlsx() {
    await generateCandleFile({
      product: productID,
      granularity: granularity,
      start: start,
      end: end
    })
    refreshUser();
  }


  useEffect(() => {
    // refresh the products every 30 seconds
    const interval = setInterval(() => {
      console.log('refreshing products');

      refreshProducts();
    }, 30_000);
    return () => clearInterval(interval);

  }, [refreshProducts]);


  useEffect(() => {
    const refresh = async () => {
      await refreshUser();
      await refreshExportableFiles();
    }

    let timer: NodeJS.Timeout;

    if (user.exporting) {
      timer = setTimeout(() => {
        refresh();
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [user, refreshUser, refreshExportableFiles])



  // end should start as the current date without the time
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  // start should start as 30 days ago
  const [start, setStart] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState('ONE_MINUTE');

  return (
    <div className={`Products settings-panel scrollable thin-scroll ${theme}`}>



      <div className={`divider ${theme}`} />

      <Collapser title='Candles'>
        <div className='left-border'>
          <p>
            select a date range and granularity and a file will be generated for you to download.
            This may take a few minutes.
            The file will be available for download in the "Available files to download" section below.
            If there are more than 5 files at any time, the oldest file will be deleted.
          </p>
          {/* {JSON.stringify(user)} */}
          {/* <br /> */}
          {/* {JSON.stringify(end)} */}
          {/* add two date selectors. one tied to the start value, one tied to the end value */}
          <label htmlFor="start">Start date:</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <label htmlFor="end"> End date:</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          <br />
          <br />

          {/* selector to pick the granularity */}
          <label htmlFor="granularity">Granularity:</label>
          <select
            name="granularity"
            id="granularity"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
          >
            {granularities.map((granularity, index) => {
              return (
                <option key={index} value={granularity.name}>{granularity.readable}</option>
              )
            })}
          </select>

          <br />
          <br />
          {!user.exporting
            ? <button
              className={`btn-red medium ${user.theme}`}
              onClick={() => { exportCandleXlsx() }}
            >Generate</button>
            : <p>Generating...</p>
          }

          {/* display the list of files that are available to download from the account reducer.
            the state is just an array of file names */}
          <br />
          <p>Available files to download:</p>
          {exportableFiles?.map((file, index) => {
            return (
              <div key={index}>
                {/* each file should be a link that will call the download function */}
                <button
                  className={`btn-yellow btn-file ${user.theme}`}
                  onClick={() => { downloadFile(file, 'xlsx') }}
                >{file}</button>
                <br />
                {/* <br /> */}
              </div>
            )
          })}
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />


      {/* ACTIVE PRODUCTS */}
      {/* <div className='products-header'> */}
      {/* <h4>Currently Active ({products?.activeProducts?.length})</h4> */}
      <Collapser title='Active Products'
        headerElement={
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
          </label>}>
        {/* </div> */}
        {props.tips && <p>
          These are all the trades you have currently set to trade.
          Deleting them will delete all active trades and stop the bot from trading them.
        </p>}
        <ProductTable key={"activeProducts"} parent={'activeProducts'} products={products.activeProducts} />
      </Collapser>

      <div className={`divider ${theme}`} />
      {/* AVAILABLE PRODUCTS */}
      {/* <div className='products-header'> */}
      {/* <h4>Available ({products?.allProducts?.length})</h4> */}
      <Collapser title='Available Products'
        headerElement={
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
          </label>}>
        {/* </div> */}
        {props.tips && <p>
          These are all the trades available on Coinbase. Setting them as active will allow them to show in the dropdown by the settings button,
          and will allow the bot to trade them.
        </p>}
        {/* table to display all products */}
        <ProductTable key={"allProducts"} parent={'allProducts'} products={products.allProducts} padNumbers={padNumbers} />
      </Collapser>
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Products;