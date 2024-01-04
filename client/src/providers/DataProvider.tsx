// DataContext.ts
import { useState, ReactNode, useRef, useEffect, useMemo } from 'react'
import useGetFetch from '../hooks/useGetFetch';
import usePutFetch from '../hooks/usePutFetch';
import { Messages, OrderParams, Orders, Product, Products, ProfitForDuration } from '../types/index';
import usePostFetch from '../hooks/usePostFetch';
import { DataContext } from '../contexts/DataContext';
import { useUser } from '../hooks/useUser';
import useLocalStorage from '../hooks/useLocalStorage';


export function DataProvider({ children }: { children: ReactNode }) {
  // console.log('******   ****** DataProvider rendering ******   ******');
  // state for this context
  const [showSettings, setShowSettings] = useState(false);
  const [productID, setProductID] = useState('DOGE-USD');
  // const [currentPrice, setCurrentPrice] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const canScroll = useRef(true);
  const [collapses, setCollapses] = useLocalStorage<{ [key: string]: boolean }>('collapses', {});

  useEffect(() => {
    canScroll.current = isAutoScroll;
  }, [isAutoScroll]);

  // user
  const { user, refreshUser } = useUser();

  /////////////////////////
  //////// ACCOUNT ////////
  /////////////////////////

  // GET PRODUCTS
  const productsNoVolumeOptions = useMemo(() => ({
    url: '/api/account/products',
    defaultState: { allProducts: [], activeProducts: [] },
    preload: true,
    from: 'products in data context'
  }), []);
  const {
    data: productsNoVolume,
    refresh: refreshProducts,
  } = useGetFetch<Products>(productsNoVolumeOptions)

  const [products, setProducts] = useState<Products>({ allProducts: [], activeProducts: [] });

  useEffect(() => {
    const newAllProducts = productsNoVolume.allProducts.slice(0).map(product => {
      return ({
        ...product,
        volume_in_quote: (Number(product.volume_24h) * Number(product.price)).toFixed(product.pqd || 2),
      })
    });

    const newActiveProducts = productsNoVolume.activeProducts.slice(0).map(product => ({
      ...product,
      volume_in_quote: (Number(product.volume_24h) * Number(product.price)).toFixed(product.pqd || 2),
    }));

    setProducts({ allProducts: newAllProducts, activeProducts: newActiveProducts });
    setProductID(productsNoVolume.activeProducts[0]?.product_id || 'DOGE-USD')

  }, [productsNoVolume]);

  // GET PROFIT
  const profitOptions = useMemo(() => ({
    url: `/api/account/profit/${productID}`,
    defaultState: [],
    preload: true,
    from: 'profit/{productID} in data context'
  }), [productID]);
  const {
    data: profit,
    refresh: refreshProfit,
  } = useGetFetch<ProfitForDuration[]>(profitOptions)

  // GET BOT MESSAGES
  const botMessagesOptions = useMemo(() => ({
    url: `/api/account/messages`,
    defaultState: { botMessages: [], chatMessages: [] },
    preload: true,
    from: 'messages in data context',
  }), []);
  const {
    data: messages,
    refresh: refreshBotMessages,
  } = useGetFetch(botMessagesOptions)

  // SEND CHAT
  const sendChatOptions = useMemo(() => ({
    url: `/api/account/messages`,
    from: 'sendChat in data context',
  }), []);
  const {
    postData: sendChat,
    // deleteData: deleteChat,
  } = usePostFetch(sendChatOptions)

  // // AVAILABLE FUNDS
  const availableBase = user.availableFunds?.[productID]?.base_available || 0;
  const availableQuote = user.availableFunds?.[productID]?.quote_available || 0;

  const baseID = user.availableFunds?.[productID]?.base_currency || '';
  const quoteID = user.availableFunds?.[productID]?.quote_currency || '';

  const botErrorsOptions = useMemo(() => ({
    url: `/api/account/errors`,
    defaultState: [],
    preload: true,
    from: 'botErrors in data context',
  }), []);
  const {
    data: botErrors,
    refresh: refreshBotErrors,
  } = useGetFetch<Messages>(botErrorsOptions)

  // ////////////////////////
  // //////// ORDERS ////////
  // ////////////////////////

  // GET ORDERS
  const ordersOptions = useMemo(() => ({
    url: `/api/orders/${productID}`,
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
    from: 'orders/${productID} in data context'
  }), [productID]);
  const {
    data: orders,
    refresh: refreshOrders,
  } = useGetFetch<Orders>(ordersOptions)

  // SYNC ORDERS
  const syncOrdersOptions = useMemo(() => ({
    url: `/api/orders`,
    from: 'syncOrders in data context'
  }), []);
  const {
    putData: syncOrders,
  } = usePutFetch(syncOrdersOptions)

  // CREATE ORDER PAIR
  const createOrderPairOptions = useMemo(() => ({
    url: `/api/orders/${productID}`,
    from: 'createOrderPair in data context',
    refreshCallback: refreshOrders,
  }), [productID, refreshOrders]);
  const { postData: createOrderPair } = usePostFetch(createOrderPairOptions)

  ///////////////////////
  //////// TRADE ////////
  ///////////////////////

  // SYNC PAIR
  const syncPairOptions = useMemo(() => ({
    url: `/api/trade`,
    from: 'syncPair in data context'
  }), []);
  const { putData: syncPair } = usePutFetch(syncPairOptions)

  const createMarketTradeOptions = useMemo(() => ({
    url: `/api/trade/market`,
    from: 'createMarketTrade in data context',
    refreshCallback: () => { refreshOrders(); refreshUser() },
  }), [refreshOrders, refreshUser]);
  const { postData: createMarketTrade } = usePostFetch(createMarketTradeOptions)

  // TRADE FUNCTIONS
  const currentProduct: Product = useMemo(() => {
    return (
      products.allProducts.find((product) => product.product_id === productID) || {} as Product);
  }, [products.allProducts, productID]);
  // console.log(currentProduct, '< currentProduct');

  const pqd = currentProduct?.pqd;
  const pbd = currentProduct?.pbd;

  // TRADE STATE
  const [collapseTradePanel, setCollapseTradePanel] = useLocalStorage<boolean>('collapseTradePanel', true);
  const [marketOrder, setMarketOrder] = useState<OrderParams>({
    base_size: 0,
    quote_size: 0,
    side: 'BUY',
  });

  const [tradeType, setTradeType] = useState('Market Order');

  useEffect(() => {
    setMarketOrder((prevMarketOrder: OrderParams) => {
      return { ...prevMarketOrder, base_size: Number(currentProduct.base_min_size) }
    })
  }, [currentProduct]);

  ////////////////////////
  //////// SOCKETS ///////
  ////////////////////////

  // handlers for the different socket messages
  const fetchHandlers = useMemo(() => ({
    'error': refreshBotErrors,
    'messageUpdate': refreshBotMessages,
    'orderUpdate': () => { refreshOrders(); refreshProfit(); },
    'productUpdate': refreshProducts,
    'profitUpdate': refreshProfit,
    'userUpdate': refreshUser,
  }), [refreshBotErrors, refreshBotMessages, refreshOrders, refreshProducts, refreshProfit, refreshUser]);

  return (
    <DataContext.Provider
      value={
        {
          fetchHandlers,
          // SETTINGS
          showSettings, setShowSettings,
          collapses, setCollapses,
          isAutoScroll, setIsAutoScroll, canScroll,

          // // ACCOUNT
          profit, refreshProfit,
          // resetProfit, 
          availableBase, availableQuote,

          // // products
          products, currentProduct, pqd, pbd,
          productID, setProductID, refreshProducts,
          // currentPrice,
          baseID, quoteID,

          // // messages
          messages, refreshBotMessages,
          botErrors, refreshBotErrors, sendChat,

          // // ORDERS
          orders, refreshOrders,
          createMarketTrade, createOrderPair,
          syncPair,
          syncOrders, // does this still realistically get used?

          // // TRADE
          marketOrder, setMarketOrder, tradeType, setTradeType,
          collapseTradePanel, setCollapseTradePanel,
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

// export const useData = () => useContext(DataContext)
