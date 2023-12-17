// DataContext.ts
import {
  createContext,
  // useCallback,
  useContext, useState, ReactNode, useRef, useEffect
} from 'react'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';
// import { addProductDecimals } from '../shared.js';
import { useUser } from './UserContext.js';
import usePutFetch from '../hooks/usePutFetch.js';
// import { devLog } from '../shared.js';
const DataContext = createContext<any | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  // console.log('DataProvider rendering ***************');
  // state for this context
  const [showSettings, setShowSettings] = useState(false);
  const [productID, setProductID] = useState('DOGE-USD');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const canScroll = useRef(true);
  // user
  const { user } = useUser();
  // sockets
  const [coinbotSocket, setCoinbotSocket] = useState('closed');
  const deadCon = (coinbotSocket !== 'open') ? true : false;
  const [socketStatus, setSocketStatus] = useState('closed');


  /////////////////////////
  //////// ACCOUNT ////////
  /////////////////////////

  // ACCOUNT ROUTES
  const {
    data: products,
    refresh: refreshProducts,
    // updateRefreshData: toggleActiveProduct,
  } = useGetFetch('/api/account/products', {
    defaultState: {},
    preload: true,
    from: 'products in data context'
  })
  // get the profits for the selected product
  const { data: profit,
    refresh: refreshProfit,
    // updateData: resetProfit,
  } = useGetFetch(`/api/account/profit/${productID}`, {
    defaultState: [],
    preload: true,
    from: 'profit/{productID} in data context'
  })
  // get messages sent from the bot
  const {
    data: messages,
    refresh: refreshBotMessages,
    // createRefreshData: sendChat,
  } = useGetFetch(`/api/account/messages`, {
    defaultState: { botMessages: [], chatMessages: [] },
    preload: true,
    from: 'messages in data context',
  })

  // // AVAILABLE FUNDS
  const availableBase = user.availableFunds?.[productID]?.base_available;
  const availableQuote = user.availableFunds?.[productID]?.quote_available;

  // // get errors sent from the bot
  // const { data: botErrors, refresh: refreshBotErrors }
  //   = useFetchData(`/api/account/errors`, { defaultState: [] })

  // ////////////////////////
  // //////// ORDERS ////////
  // ////////////////////////

  // ORDERS ROUTES - for management of orders that are stored in the database
  // delete range will take an array with the start and end values. deleteAllForProduct will take nothing?
  const {
    data: orders,
    refresh: refreshOrders,
    // setData: setOrders,
    // createRefreshData: createOrderPair,
    // deleteRefreshData: deleteRangeForProduct
  } = useGetFetch(`/api/orders/${productID}`, {
    defaultState: {},
    preload: true,
    from: 'orders/{productID} in data context'
  })
  const {
    putData: syncOrders,
    // deleteData: deleteOrderNoRefresh,
    // deleteData: deleteAllNoRefresh
  } = usePutFetch({ url: `/api/orders`, })

  const deleteOrder = async (orderID: string) => {
    const { deleteData } = useDeleteFetch({ url: `/api/orders/${orderID}`, })
    await deleteData();
    refreshOrders();
  }
  // ORDERS FUNCTIONS
  // combine delete and refresh into one function because they hit different routes
  // const deleteOrder = async (orderID) => { await deleteOrderNoRefresh(orderID); refreshOrders() }
  // const deleteAll = async () => { await deleteAllNoRefresh(); refreshOrders() }

  // ///////////////////////
  // //////// TRADE ////////
  // ///////////////////////

  // // TRADE ROUTES - for active "hot" trading
  // const { updateData: syncPair } = useFetchData(`/api/trade/`, { defaultState: {}, noLoad: true });
  // const { createData: createMarketTrade } = useFetchData(`/api/trade/market`, { defaultState: {}, noLoad: true });
  // const { data: exportableFiles, refresh: refreshExportableFiles } = useFetchData(`/api/account/exportableFiles`, { defaultState: [] })
  // // TRADE FUNCTIONS
  // const currentProductNoDecimals = products?.allProducts?.find((product) => product.product_id === productID);
  // const currentProduct = addProductDecimals(currentProductNoDecimals);

  // //////////////////////////
  // //////// SETTINGS ////////
  // ////////////////////////// 

  // // SETTINGS ROUTES - for management of per user settings
  // const { updateData: setProfitAccuracy } = useFetchData(`/api/settings/profitAccuracy`, { defaultState: null, noLoad: true })
  // const { updateData: updateMaxTradeLoad } = useFetchData(`/api/settings/tradeLoadMax`, { defaultState: null, noLoad: true })
  // const { updateData: updateKillLock } = useFetchData(`/api/settings/killLock`, { defaultState: null, noLoad: true })
  // const { updateData: updatePause } = useFetchData(`/api/settings/pause`, { defaultState: null, noLoad: true })
  // const { updateData: updateTheme } = useFetchData(`/api/settings/theme`, { defaultState: null, noLoad: true })
  // const { updateData: updateSyncQuantity } = useFetchData(`/api/settings/syncQuantity`, { defaultState: null, noLoad: true })

  // // SETTINGS FUNCTIONS
  // async function updateProfitAccuracy(profit_accuracy) { await setProfitAccuracy({ profit_accuracy }); refreshUser(); }
  // async function pause() { await updatePause(); refreshUser(); }
  // async function killLock() { await updateKillLock(); refreshUser(); }
  // async function setTheme(theme) { await updateTheme({ theme }); refreshUser(); }
  // async function sendTradeLoadMax(max_trade_load) { await updateMaxTradeLoad({ max_trade_load }); refreshUser(); }
  // async function sendSyncQuantity(sync_quantity) { await updateSyncQuantity({ sync_quantity }); refreshUser(); }


  // ///////////////////
  // //// UTILITIES ////
  // ///////////////////
  // // if products.activeProducts changes, the selected product will be set to the first product in the list
  // useEffect(() => {
  //   setProductID(products?.activeProducts?.[0]?.product_id);
  // }, [products.activeProducts, setProductID])



  return (
    <DataContext.Provider
      value={
        {
          // SETTINGS
          showSettings, setShowSettings,
          isAutoScroll, setIsAutoScroll, canScroll,

          // // ACCOUNT
          profit, refreshProfit,
          // resetProfit, 
          availableBase, availableQuote,

          // // products
          products,// currentProduct, 
          productID, setProductID, refreshProducts,
          // toggleActiveProduct,

          // // messages
          messages, refreshBotMessages,
          // botErrors, refreshBotErrors, sendChat,

          // // ORDERS
          orders, refreshOrders,
          // createMarketTrade, createOrderPair, syncPair, 
          syncOrders, // does this still realistically get used?
          deleteOrder,
          // deleteRangeForProduct,
          // deleteAll,

          // // TRADE
          // exportableFiles, refreshExportableFiles,

          // // SETTINGS
          // pause, killLock, setTheme, sendTradeLoadMax, updateProfitAccuracy, sendSyncQuantity,

          // SOCKETS
          coinbotSocket, setCoinbotSocket, socketStatus, setSocketStatus, deadCon
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
