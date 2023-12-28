import { MutableRefObject, createContext, useContext } from "react";

interface TimestampContextProps {
  fetchIdentifiers: MutableRefObject<string[]>;
}

export const IdentifierContext
  = createContext<TimestampContextProps>({} as TimestampContextProps)

export const useIdentifiers = () => useContext(IdentifierContext)