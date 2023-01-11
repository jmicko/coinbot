// DataContext.js
import {
  createContext,
  // useCallback,
  useContext, useEffect, useState
} from 'react'
import { useFetchData } from '../hooks/fetchData'
import { addProductDecimals } from '../shared';
// import { useUser } from './UserContext';

const DataContext = createContext()

export function DataProvider({ children }) {
  // state for this context
  const [productID, setProductID] = useState('BTC-USD');

  // account routes
  const { data: products, refresh: refreshProducts, updateData: toggleActiveProduct } = useFetchData('/api/account/products', { defaultState: {} })
  // get the profits for the selected product
  const { data: profit, refresh: refreshProfit, updateData: resetProfitTEST } = useFetchData(`/api/account/profit/${productID}`, { defaultState: {}, notNull: [productID] })

  // orders routes
  // delete range will take an array with the start and end values. deleteAllForProduct will take nothing?
  const { data: orders, refresh: refreshOrders, createRefreshData: createOrderPair, deleteRefreshData: deleteRangeForProduct } = useFetchData(`/api/orders/${productID}`, { defaultState: {}, notNull: [productID] })
  const { updateData: syncOrders, deleteData: deleteOrderNoRefresh, deleteData: deleteAllNoRefresh } = useFetchData(`/api/orders`, { defaultState: {}, noLoad: true })
  // combine delete and refresh into one function because they hit different routes
  const deleteOrder = async (orderID) => { await deleteOrderNoRefresh(orderID); refreshOrders() }
  const deleteAll = async () => { await deleteAllNoRefresh(); refreshOrders() }

  // trade routes - for active "hot" trading
  const { updateData: syncPair } = useFetchData(`/api/trade/`, { defaultState: {}, noLoad: true });
  const { createData: createMarketTrade } = useFetchData(`/api/trade/market`, { defaultState: {}, noLoad: true });

  const { data: exportableFiles, refresh: refreshExportableFiles } = useFetchData(`/api/account/exportableFiles`, { defaultState: [] })

  const currentProductNoDecimals = products?.allProducts?.find((product) => product.product_id === productID);
  const currentProduct = addProductDecimals(currentProductNoDecimals);

  // if products.activeProducts changes, the selected product will be set to the first product in the list
  useEffect(() => {
    setProductID(products?.activeProducts?.[0]?.product_id);
  }, [products.activeProducts, setProductID])

  function resetProfit(data) {
    console.log(data, 'resetting profit')
    resetProfitTEST(data);
  }

  return (
    <DataContext.Provider
      value={
        {
          products, currentProduct, productID, setProductID, refreshProducts, toggleActiveProduct,
          orders, refreshOrders, createMarketTrade, createOrderPair, syncPair, syncOrders,
          deleteOrder, deleteRangeForProduct, deleteAll,
          profit, refreshProfit, resetProfit,
          exportableFiles, refreshExportableFiles
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
