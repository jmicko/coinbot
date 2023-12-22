// DataContext.ts
import { useState, ReactNode, useRef, useEffect } from 'react'
import useGetFetch from '../hooks/useGetFetch';
import { addProductDecimals } from '../shared';
import usePutFetch from '../hooks/usePutFetch';
import { OrderParams, Orders, Product, ProductWithDecimals, Products, ProfitForDuration } from '../types/index';
import usePostFetch from '../hooks/usePostFetch';
import { useUser } from './useUser';
import { DataContext } from './useData';
// import { devLog } from '../shared';


export function DataProvider({ children }: { children: ReactNode }) {
  // console.log('DataProvider rendering ***************');
  // state for this context
  const [showSettings, setShowSettings] = useState(false);
  const [productID, setProductID] = useState('DOGE-USD');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const canScroll = useRef(true);

  useEffect(() => {
    canScroll.current = isAutoScroll;
  }, [isAutoScroll]);

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
  } = useGetFetch<Products>('/api/account/products', {
    defaultState: { allProducts: [], activeProducts: [] },
    preload: true,
    from: 'products in data context'
  })
  // console.log(products, 'products object in data context');

  // get the profits for the selected product
  const { data: profit,
    refresh: refreshProfit,
    // updateData: resetProfit,
  } = useGetFetch<ProfitForDuration[]>(`/api/account/profit/${productID}`, {
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
  const {
    postData: sendChat,
    // deleteData: deleteChat,
  } = usePostFetch({
    url: `/api/account/messages`,
    from: 'sendChat in data context',
    refreshCallback: refreshBotMessages,
  })

  // // AVAILABLE FUNDS
  const availableBase = user?.availableFunds?.[productID]?.base_available || 0;
  const availableQuote = user?.availableFunds?.[productID]?.quote_available || 0;

  const baseID = user.availableFunds?.[productID]?.base_currency;
  const quoteID = user.availableFunds?.[productID]?.quote_currency;

  // // get errors sent from the bot
  // const { data: botErrors, refresh: refreshBotErrors }
  //   = useFetchData(`/api/account/errors`, { defaultState: [] })
  const {
    data: botErrors,
    refresh: refreshBotErrors,
  } = useGetFetch(`/api/account/errors`, {
    defaultState: [],
    preload: true,
    from: 'botErrors in data context',
  })

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
  } = useGetFetch<Orders>(`/api/orders/${productID}`, {
    defaultState: {
      buys: [],
      sells: [],
      counts: {
        totalOpenOrders: { count: 0 },
        totalOpenBuys: { count: 0 },
        totalOpenSells: { count: 0 }
      }
    },
    preload: true,
    from: 'orders/{productID} in data context'
  })
  const {
    putData: syncOrders,
    // deleteData: deleteOrderNoRefresh,
    // deleteData: deleteAllNoRefresh
  } = usePutFetch({ url: `/api/orders`, from: 'syncOrders in data context' })

  const { postData: createOrderPair } = usePostFetch({
    url: `/api/orders/${productID}`,
    from: 'createOrderPair in data context',
    refreshCallback: refreshOrders,
  })

  // const deleteOrder = async (orderID: string) => {
  //   const { deleteData } = useDeleteFetch({ url: `/api/orders/${orderID}`, from: 'deleteOrder in data context' });
  //   await deleteData();
  //   refreshOrders();
  // }
  // ORDERS FUNCTIONS
  // combine delete and refresh into one function because they hit different routes
  // const deleteOrder = async (orderID) => { await deleteOrderNoRefresh(orderID); refreshOrders() }
  // const deleteAll = async () => { await deleteAllNoRefresh(); refreshOrders() }

  // ///////////////////////
  // //////// TRADE ////////
  // ///////////////////////

  // // TRADE ROUTES - for active "hot" trading
  // const { updateData: syncPair } = useFetchData(`/api/trade/`, { defaultState: {}, noLoad: true });
  const { putData: syncPair } = usePutFetch({
    url: `/api/trade`,
    from: 'syncPair in data context',
    refreshCallback: refreshOrders,
  })
  // const { createData: createMarketTrade } = useFetchData(`/api/trade/market`, { defaultState: {}, noLoad: true });
  const { postData: createMarketTrade } = usePostFetch({
    url: `/api/trade/market`,
    from: 'createMarketTrade in data context',
    refreshCallback: refreshOrders,
  })
  // const { data: exportableFiles, refresh: refreshExportableFiles } = useFetchData(`/api/account/exportableFiles`, { defaultState: [] })
  // TRADE FUNCTIONS
  const currentProductNoDecimals: Product
    = products.allProducts.find((product) => product.product_id === productID) || {} as Product;
    // console.log(currentProductNoDecimals, 'currentProductNoDecimals');
    

  const currentProduct: ProductWithDecimals
    =  addProductDecimals(currentProductNoDecimals);

  const pqd = currentProduct?.quote_increment_decimals || 2;
  const pbd = currentProduct?.base_increment_decimals || 2;

  // TRADE STATE
  const [marketOrder, setMarketOrder] = useState<OrderParams>({
    base_size: 0,
    quote_size: 0,
    side: 'BUY',
  });
  const [tradeType, setTradeType] = useState('market');

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
          products, currentProduct, pqd, pbd,
          productID, setProductID, refreshProducts,
          baseID, quoteID,
          // toggleActiveProduct,

          // // messages
          messages, refreshBotMessages,
          botErrors, refreshBotErrors, sendChat,

          // // ORDERS
          orders, refreshOrders,
          createMarketTrade, createOrderPair, 
          syncPair,
          syncOrders, // does this still realistically get used?
          // deleteOrder,
          // deleteRangeForProduct,
          // deleteAll,

          // // TRADE
          // exportableFiles, refreshExportableFiles,
          marketOrder, setMarketOrder, tradeType, setTradeType,

          // // SETTINGS
          // pause, killLock, setTheme, sendTradeLoadMax, updateProfitAccuracy, sendSyncQuantity,

          // SOCKETS
          coinbotSocket, setCoinbotSocket, socketStatus, setSocketStatus, deadCon,
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

// export const useData = () => useContext(DataContext)
