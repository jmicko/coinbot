import { createContext, useContext } from "react";
import { User } from "../types";

interface UserContextProps {
  user: User | null;
  userLoading: boolean;
  userError: Error | null;
  deleteLoading: boolean;
  deleteError: Error | null;
  refreshUser: () => void;
  logout: () => void;
  // login: ({username: string, password: string}) => void;
  login: ({username, password}: {username: string, password: string}) => void;
  registerNew: ({username, password}: {username: string, password: string}) => void;
  deleteYourself: () => void;
  theme: string;
  btnColor: string;
  // setUser: React.Dispatch<React.SetStateAction<User>>;
}


export const UserContext = createContext<UserContextProps>({} as UserContextProps);

export const useUser = () => useContext(UserContext)
