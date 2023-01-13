import { useCallback, useEffect, useRef, useState } from 'react'

// noLoad is true if the get route should not be called right away, probably because it does not exist
export function useFetchData(url, { defaultState, notNull, noLoad, refreshUser }) {

  const [data, setData] = useState(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // create a ref to the notNull array so that it doesn't need to be a dependency
  const notNullRef = useRef();
  notNullRef.current = notNull;

  // I'm sure there's a better way to do this, but I'm not sure what it is
  const checkFailureCallback = useCallback(checkFailure, [notNullRef, url])

  const fetchDataCallback = useCallback(fetchData, [url, checkFailureCallback])
  const postDataCallback = useCallback(postData, [url, checkFailureCallback])
  const putDataCallback = useCallback(putData, [url, checkFailureCallback])
  const deleteDataCallback = useCallback(deleteData, [url, checkFailureCallback])

  // GET function
  async function fetchData() {
    try {
      // check if any of the notNull values are null or undefined
      if (checkFailureCallback()) return;

      // console.log('fetching data from', url, 'in useFetchData hook')
      setIsLoading(true)
      // call with the config object if there is one
      const response = await fetch(url)
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in useFetchData hook')
        setIsLoading(false)
        setError(response)

        if (response.status === 403) {
          console.log('403 error in useFetchData hook')
          setData(defaultState)
          refreshUser && refreshUser();
        }
        return
      }
      const data = await response.json()
      // console.log(data, 'fetched data from', url, 'in useFetchData hook')
      setData(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in useFetchData hook4385672390498570239487502394875029394876657023945876094328570239487')
      setError(error)
      setIsLoading(false)
    }
  }


  // POST function
  async function postData(dataToPost) {
    try {
      // check if any of the notNull values are null or undefined
      if (checkFailureCallback()) return;

      // console.log(dataToPost, 'posting data to', url, 'in usePostData hook')
      setIsLoading(true)

      // make the post request
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPost)
      })

      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in usePostData hook')
        setIsLoading(false)
        // console.log('=============================================================')
        // console.log('=============================================================')
        // console.log('=============================================================')
        // console.log('=============================================================')
        setError(response?.status)
        // console.log('=============================================================', response)
        return
      }
      if (response.status === 204) { // no content
        console.log('response status 204 in usePostData hook')
        setIsLoading(false)
        setError(null)
        return
      } else if (response.status === 201) { // created. this should return data if relevant
        console.log('response status 201 in usePostData hook')
        const data = await response.json()
        console.log(data, 'received data after posting to', url, 'in usePostData hook')
        setData(data)
        setIsLoading(false)
        setError(null)
        return
      }
      // const data = await response.json()
      // console.log('posted data to', url, 'in usePostData hook')
      // setResponse(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in usePostData hook')
      setError(error)
      setIsLoading(false)
    }
  }

  // PUT function
  async function putData(dataToPut) {
    try {
      // check if any of the notNull values are null or undefined
      // console.log(dataToPut, 'putting dataToPut to', url, 'in usePutdataToPut hook')
      if (checkFailureCallback()) return;

      setIsLoading(true)

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPut)
      })
      // console.log(response, 'response in usePutdataToPut hook')
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in usePutdataToPut hook')
        setIsLoading(false)
        setError(response)
        return
      }
      if (response.status === 201) { // created. this should return data if relevant
        console.log('response status 201 in usePostData hook')
        const data = await response.json()
        console.log(data, 'received data after posting to', url, 'in usePutData hook')
        setData(data)
        setIsLoading(false)
        setError(null)
        return
      }
      if (response.status === 403) {
        console.log('403 error in useFetchData hook')
        setData(defaultState)
        setIsLoading(false)
        setError(response)
        refreshUser && refreshUser()
        return
      }
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in usePutData hook')
      setError(error)
      setIsLoading(false)
    }
  }

  // DELETE function
  async function deleteData(urlArray) {
    const method = 'DELETE'
    try {
      setIsLoading(true)
      // check if any of the notNull values are null or undefined
      if (checkFailureCallback()) return;

      // check if the urlArray is an array or if it's a notNull string. 
      // if urlArray is an array,  join it with '/' to create the url
      // if urlArray is a string, use it as the url
      const deleteUrl = Array.isArray(urlArray)
        ? `${url}/${urlArray.join('/')}`
        // check if null or undefined. If it is, use the url as is
        : urlArray === null || urlArray === undefined
          ? url
          : `${url}/${urlArray}`
      // console.log(deleteUrl, 'url in useDeleteData hook', urlArray, 'urlArray in useDeleteData hook')


      // check if the url is a string
      if (typeof deleteUrl !== 'string') {
        console.log(deleteUrl, 'deleteUrl is not a string in useDeleteData hook')
        setIsLoading(false)
        setError({ message: 'deleteUrl is not a string' })
        return
      }

      // console.log(url, 'url in useDeleteData hook')


      console.log('deleting data from', deleteUrl, 'in useDeleteData hook')
      const response = await fetch(deleteUrl, { method: method })
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in useDeleteData hook')
        setIsLoading(false)
        setError(response)
        if (response.status === 403) {
          console.log('403 error in useFetchData hook')
          setData(defaultState)
          refreshUser && refreshUser()
        }
        return
      }

      const data = await response.json() ? await response.json() : null
      console.log(data, 'deleted data from', url, 'in useDeleteData hook')
      // setResponse(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, `error in fetchData hook with method ${method}`)
      setError(error)
      setIsLoading(false)
    }
  }

  // // download an excel file
  // async function downloadFile(fileName) {
  //   try {
  //     console.log('downloading file from', url, 'in useDownloadFile hook')
  //     // get the file array buffer
  //     const response = await fetch(`${url}${fileName ? `/${fileName}` : ''}`, {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'arraybuffer'
  //       }
  //     })
  //     // check if the response is ok
  //     if (!response.ok) {
  //       const blob = new Blob([response.body], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  //       const link = document.createElement('a');
  //       link.href = window.URL.createObjectURL(blob);
  //       link.download = `${fileName}.xlsx`;
  //       link.click();
  //     }
  //   } catch (error) {
  //     console.log(error, 'error in useDownloadFile hook')
  //     setError(error)
  //     setIsLoading(false)
  //   }
  // }
  async function downloadFile(fileName) {
    try {
      // console.log('download file route has started', fileName);
      const response = await fetch(`${url}${fileName ? `/${fileName}` : ''}`);
      if (!response.ok) {
        // console.log('200 error in useFetchData hook')

        if (response.status === 403) {
          // console.log('403 error in useFetchData hook')
          setData(defaultState)
          refreshUser && refreshUser()
        }
        setError(response)
        setIsLoading(false)
        return
      }
      const blob = await response.blob();
      // console.log('download file route has succeeded', blob);
      // save the file to the client
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${fileName}.xlsx`;
      link.click();
    } catch (error) {
      // console.log('download file route has failed', error);
    }
  }






  function checkFailure() {
    if (notNullRef.current && notNullRef.current.length > 0 && Array.isArray(notNullRef.current) && notNullRef.current.some(value => value === null || value === undefined)) {
      for (let i = 0; i < notNullRef.current.length; i++) {
        if (notNullRef.current[i] === null || notNullRef.current[i] === undefined) {
          // console.log('notNullRef.current value is null or undefined, not fetching data from', url, 'in useFetchData hook');
          setIsLoading(false);
          setError({ message: 'null or undefined value in notNullRef.current array' });
          return true;
        }
      }
    }
  }


  useEffect(() => {
    if (noLoad) return;
    // console.log('useEffect in useFetchData hook -------- getting data on load from', url, '--------')
    fetchDataCallback();
  }, [fetchDataCallback, url, noLoad])


  // okay I think I should be exporting useCallbacks instead of the functions themselves
  // function refresh() {
  //   fetchDataCallback()
  // }

  async function createRefreshData(data) {
    try {
      // console.log(data, 'creating data in useFetchData hook ')
      await postDataCallback(data)
      await fetchDataCallback();
    } catch (err) {
      console.log(err, 'error in updateData function in useFetchData hook')
    }
  }

  // const createDataCallback = useCallback(createData, [postDataCallback, fetchDataCallback])

  async function updateRefreshData(data) {
    try {
      // console.log(data, 'updating data in useFetchData hook  %%%%%%%%%%%%%%')
      await putDataCallback(data);
      await fetchDataCallback();
    } catch (err) {
      console.log(err, 'error in updateData function in useFetchData hook')
    }
  }

  async function deleteRefreshData(data) {
    try {
      // console.log('deleting data in useFetchData hook  %%%%%%%%%%%%%%')
      await deleteDataCallback(data);
      await fetchDataCallback();
    } catch (err) {
      console.log(err, 'error in deleteData function in useFetchData hook')
    }
  }


  const createRefreshDataCallback = useCallback(createRefreshData, [postDataCallback, fetchDataCallback])
  const updateRefreshDataCallback = useCallback(updateRefreshData, [putDataCallback, fetchDataCallback])
  const deleteRefreshDataCallback = useCallback(deleteRefreshData, [deleteDataCallback, fetchDataCallback])

  function clear() {
    setData(defaultState)
    setIsLoading(false)
    setError(null)
  }

  return {
    data, isLoading, error, clear,
    refresh: fetchDataCallback,
    createData: postDataCallback,
    createRefreshData: createRefreshDataCallback,
    updateData: putDataCallback,
    updateRefreshData: updateRefreshDataCallback,
    deleteData: deleteDataCallback,
    deleteRefreshData: deleteRefreshDataCallback,
    downloadFile,
  }
}
