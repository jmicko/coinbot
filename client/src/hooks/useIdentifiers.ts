import { useContext } from "react";
import { IdentifierContext } from "../contexts/IdentifierContext";



export const useIdentifiers = () => useContext(IdentifierContext)