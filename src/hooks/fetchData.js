import { useCallback, useEffect, useRef, useState } from 'react'

export function useFetchData(url, { defaultState, config, notNull }) {
  const [data, setData] = useState(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // create a ref to the notNull array so that it doesn't need to be a dependency
  const notNullRef = useRef();
  notNullRef.current = notNull;

  async function fetchData() {
    try {
      // check if any of the notNull values are null or undefined
      if (notNullRef.current && notNullRef.current.length > 0 && Array.isArray(notNullRef.current) && notNullRef.current.some(value => value === null || value === undefined)) {
        for (let i = 0; i < notNullRef.current.length; i++) {
          if (notNullRef.current[i] === null || notNullRef.current[i] === undefined) {
            console.log('notNullRef.current value is null or undefined, not fetching data from', url, 'in useFetchData hook')
            setIsLoading(false)
            setError({ message: 'null or undefined value in notNullRef.current array' })
            return
          }
        }
      }

      console.log('fetching data from', url, 'in useFetchData hook')
      setIsLoading(true)
      // call with the config object if there is one
      const response = config ? await fetch(url, config) : await fetch(url)
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in useFetchData hook')
        setIsLoading(false)
        setError(response)
        return
      }
      const data = await response.json()
      console.log(data, 'fetched data from', url, 'in useFetchData hook')
      setData(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in useFetchData hook')
      setError(error)
      setIsLoading(false)
    }
  }


  const fetchDataCallback = useCallback(
    fetchData
    , [url, config]
  )

  // useEffect(() => {
  //   console.log(notNullRef.current, 'useEffect in useFetchData hook -------- checking notNullRef.current values --------', url)
  // }, [notNullRef.current])

  useEffect(() => {
    console.log('useEffect in useFetchData hook -------- getting data on load from', url, '--------')
    //   fetchDataRef.current();
    // }, [fetchDataRef])
    fetchDataCallback();
  }, [fetchDataCallback, url])

  function refresh() {
    fetchDataCallback()
  }

  function clear() {
    setData(defaultState)
    setIsLoading(false)
    setError(null)
  }

  return { data, isLoading, error, refresh, clear }
}


  // // get products on component load
  // useEffect(() => {
  //   // check if products is an empty object
  //   if (products && Object.keys(products).length === 0 && !loadingProducts && !productsError) {
  //     console.log('+++++++++++++++++refreshing products+++++++++++++++++')
  //     refreshProducts()
  //   }
  // }, [products, loadingProducts, productsError, refreshProducts])



  // create a ref to the orders refresh function so that it doesn't need to be a dependency
  // const ordersRefresh = useRef();
  // update the ref.current value to the latest function

  // useEffect(() => {
  //   console.log(productID, '++++++++++++++++UPDATING ORDERS URL WHEN ID CHANGED++++++++++++++++')
  //   ordersRefresh.current = refreshOrders;
  // }, [refreshOrders, productID]);

  // // refresh orders when productID changes
  // useEffect(() => {
  //   if (productID !== null && productID !== undefined) {
  //     console.log(productID, '+++++++++++++++++PRODUCT CHANGED+++++++++++++++++')
  //     ordersRefresh.current();
  //   }
  // }, [productID])