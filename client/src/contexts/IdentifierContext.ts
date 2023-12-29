import { MutableRefObject, createContext } from "react";

interface TimestampContextProps {
  fetchIdentifiers: MutableRefObject<string[]>;
}

export const IdentifierContext
  = createContext<TimestampContextProps>({} as TimestampContextProps)