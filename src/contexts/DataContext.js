// DataContext.js
import {
  createContext,
  // useCallback,
  useContext, useEffect, useState
} from 'react'
import { useFetchData } from '../hooks/fetchData'
import { addProductDecimals } from '../shared';
import { useUser } from './UserContext';

const DataContext = createContext()

export function DataProvider({ children }) {
  // state for this context
  const [productID, setProductID] = useState('BTC-USD');
  // user
  const { refreshUser } = useUser();

  /////////////////////////
  //////// ACCOUNT ////////
  /////////////////////////

  // ACCOUNT ROUTES
  const { data: products, refresh: refreshProducts, updateData: toggleActiveProduct } = useFetchData('/api/account/products', { defaultState: {} })
  // get the profits for the selected product
  const { data: profit, refresh: refreshProfit, updateData: resetProfit } = useFetchData(`/api/account/profit/${productID}`, { defaultState: {}, notNull: [productID] })

  ////////////////////////
  //////// ORDERS ////////
  ////////////////////////

  // ORDERS ROUTES - for management of orders that are stored in the database
  // delete range will take an array with the start and end values. deleteAllForProduct will take nothing?
  const { data: orders, refresh: refreshOrders, createRefreshData: createOrderPair, deleteRefreshData: deleteRangeForProduct }
    = useFetchData(`/api/orders/${productID}`, { defaultState: {}, notNull: [productID] })
  const { updateData: syncOrders, deleteData: deleteOrderNoRefresh, deleteData: deleteAllNoRefresh }
    = useFetchData(`/api/orders`, { defaultState: {}, noLoad: true })

  // ORDERS FUNCTIONS
  // combine delete and refresh into one function because they hit different routes
  const deleteOrder = async (orderID) => { await deleteOrderNoRefresh(orderID); refreshOrders() }
  const deleteAll = async () => { await deleteAllNoRefresh(); refreshOrders() }

  ///////////////////////
  //////// TRADE ////////
  ///////////////////////

  // TRADE ROUTES - for active "hot" trading
  const { updateData: syncPair } = useFetchData(`/api/trade/`, { defaultState: {}, noLoad: true });
  const { createData: createMarketTrade } = useFetchData(`/api/trade/market`, { defaultState: {}, noLoad: true });
  const { data: exportableFiles, refresh: refreshExportableFiles } = useFetchData(`/api/account/exportableFiles`, { defaultState: [] })
  // TRADE FUNCTIONS
  const currentProductNoDecimals = products?.allProducts?.find((product) => product.product_id === productID);
  const currentProduct = addProductDecimals(currentProductNoDecimals);

  //////////////////////////
  //////// SETTINGS ////////
  ////////////////////////// 


  // SETTINGS ROUTES - for management of per user settings
  const { updateData: setProfitAccuracy } = useFetchData(`/api/settings/profitAccuracy`, { defaultState: null, noLoad: true })
  const { updateData: updateMaxTradeLoad } = useFetchData(`/api/settings/tradeLoadMax`, { defaultState: null, noLoad: true })
  const { updateData: updateKillLock } = useFetchData(`/api/settings/killLock`, { defaultState: null, noLoad: true })
  const { updateData: updatePause } = useFetchData(`/api/settings/pause`, { defaultState: null, noLoad: true })
  const { updateData: updateTheme } = useFetchData(`/api/settings/theme`, { defaultState: null, noLoad: true })

  // SETTINGS FUNCTIONS
  async function updateProfitAccuracy(profit_accuracy) { await setProfitAccuracy({ profit_accuracy }); refreshUser(); }
  async function pause() { await updatePause(); refreshUser(); }
  async function killLock() { await updateKillLock(); refreshUser(); }
  async function setTheme(theme) { await updateTheme({ theme }); refreshUser(); }
  async function sendTradeLoadMax(max_trade_load) { await updateMaxTradeLoad({ max_trade_load }); refreshUser(); }

  ///////////////////
  //// UTILITIES ////
  ///////////////////
  // if products.activeProducts changes, the selected product will be set to the first product in the list
  useEffect(() => {
    setProductID(products?.activeProducts?.[0]?.product_id);
  }, [products.activeProducts, setProductID])



  return (
    <DataContext.Provider
      value={
        {
          // ACCOUNT
          profit, refreshProfit, resetProfit,
          products, currentProduct, productID, setProductID, refreshProducts, toggleActiveProduct,
          // ORDERS
          orders, refreshOrders, createMarketTrade, createOrderPair, syncPair, syncOrders,
          deleteOrder, deleteRangeForProduct, deleteAll,
          // TRADE
          exportableFiles, refreshExportableFiles,
          // SETTINGS
          pause, killLock, setTheme, sendTradeLoadMax, updateProfitAccuracy
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
