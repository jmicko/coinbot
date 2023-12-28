import { MutableRefObject, createContext, useContext } from "react";

interface TimestampContextProps {
  fetchTimestamps: MutableRefObject<string[]>;
}

export const TimestampContext
  = createContext<TimestampContextProps>({} as TimestampContextProps)

export const useTimestamps = () => useContext(TimestampContext)