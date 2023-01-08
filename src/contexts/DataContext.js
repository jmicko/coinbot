// DataContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { useFetchData } from '../hooks/fetchData'
// import { useUser } from './UserContext';

const DataContext = createContext()

export function DataProvider({ children }) {
  // const { user } = useUser();
  const [productID, setProductID] = useState(null);
  const { data: products, refresh: refreshProducts } = useFetchData('/api/account/products', { defaultState: {} })
  const { data: orders, refresh: refreshOrders } = useFetchData(`/api/orders/${productID}`, { defaultState: {}, notNull: [productID] })
  // get the profits for the selected product with fetchData hook
  const { data: profit, refresh: refreshProfit } = useFetchData(`/api/account/profits/${productID}`, { defaultState: {}, notNull: [productID] })

  // if products.activeProducts changes, the selected product will be set to the first product in the list
  useEffect(() => {
    setProductID(products?.activeProducts?.[0]?.product_id);
  }, [products.activeProducts, setProductID])

  return (
    <DataContext.Provider
      value={
        {
          productID, setProductID, refreshProducts, products, 
          orders, refreshOrders,
          profit, refreshProfit
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
