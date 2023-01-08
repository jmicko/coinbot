// DataContext.js
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useFetchData } from '../hooks/fetchData'
// import { useUser } from './UserContext';

const DataContext = createContext()

// const config = {
//   headers: { 'Content-Type': 'application/json' },
//   withCredentials: true,
// };

export function DataProvider({ children }) {
  // const { user } = useUser();
  const [productID, setProductID] = useState(null);
  const { data: products, refresh: refreshProducts, isLoading: loadingProducts, error: productsError } = useFetchData('/api/account/products', { defaultState: {} })
  const { data: orders, refresh: refreshOrders } = useFetchData(`/api/orders/${productID}`, { defaultState: {} })

  // get products on component load
  useEffect(() => {
    // check if products is an empty object
    if (products && Object.keys(products).length === 0 && !loadingProducts && !productsError) {
      console.log('+++++++++++++++++refreshing products+++++++++++++++++')
      refreshProducts()
    }
  }, [products, loadingProducts, productsError, refreshProducts])



  // create a ref to the orders refresh function so that it doesn't need to be a dependency
  const ordersRefresh = useRef();
  // update the ref.current value to the latest function

  useEffect(() => {
    console.log(productID, '++++++++++++++++UPDATING ORDERS URL WHEN ID CHANGED++++++++++++++++')
    ordersRefresh.current = refreshOrders;
  }, [refreshOrders, productID]);

  // refresh orders when productID changes
  useEffect(() => {
    if (productID !== null && productID !== undefined) {
      console.log(productID, '+++++++++++++++++PRODUCT CHANGED+++++++++++++++++')
      ordersRefresh.current();
    }
  }, [productID])




  return (
    <DataContext.Provider
      value={
        {
          productID, setProductID,
          orders, products,
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
