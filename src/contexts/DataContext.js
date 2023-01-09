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
  const { updateData: syncOrders } = useFetchData(`/api/orders/`, { defaultState: {} })
  // get the profits for the selected product with fetchData hook
  const { data: profit, refresh: refreshProfit, } = useFetchData(`/api/account/profit/${productID}`, { defaultState: {}, notNull: [productID] })
  const { updateData: resetProfitTEST } = useFetchData(`/api/account/profit`, { defaultState: {}, notNull: [productID] })

  const { data:exportableFiles, refresh: refreshExportableFiles } = useFetchData(`/api/account/exportableFiles`, { defaultState: [] })

  const currentProduct = products?.allProducts?.find((product) => product.product_id === productID);

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
          productID, setProductID, refreshProducts, products,
          orders, refreshOrders, syncOrders,
          profit, refreshProfit, resetProfit,
          exportableFiles, refreshExportableFiles
        }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
