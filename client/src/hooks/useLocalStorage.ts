import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useUser } from './useUser';

const isDev = import.meta.env.MODE === 'development';

// this helps differentiate apps that are all running on localhost because local storage will conflict
const PREFIX: string = isDev ? 'coinbot-dev-' : 'coinbot-pqw9743yg5r8-'

type InitialValue<T> = T | (() => T);

// this function works like a normal useState, but persists everything into local storage
export default function useLocalStorage<T>(
  key: string,
  initialValue: InitialValue<T>,
  { defaultUser = false }: { defaultUser?: boolean } = {}
): [T, Dispatch<SetStateAction<T>>] {

  const { user } = useUser();
  // defaultUser ? { user: { username: 'defaultUser' } } :
  // console.log(user, 'user from useLocalStorage hook');

  const prefixedKey: string = user?.username && !defaultUser
    ? PREFIX + user.username + '-' + key
    : PREFIX + key

  const [value, setValue] = useState<T>(() => {
    // get the item that was stored
    const jsonValue = localStorage.getItem(prefixedKey)
    // if there is a value, return it. Needs to be not null in case 0 is stored
    if (jsonValue != null) return JSON.parse(jsonValue)
    // if the initial value is a function, call the function
    if (typeof initialValue === 'function') {
      const initialValueFunction = initialValue as () => T;
      return initialValueFunction()
    } else {
      // if it's not a function, just return the value
      return initialValue
    }
  })

  // any time the key or value change, we want to set the local storage with the new value
  useEffect(() => {
    localStorage.setItem(prefixedKey, JSON.stringify(value))
  }, [prefixedKey, value])

  return [value, setValue]
}
