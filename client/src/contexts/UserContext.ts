import { createContext } from "react";
import { User } from "../types";

interface UserContextProps {
  user: User;
  userLoading: boolean;
  userError: Error | null;
  deleteLoading: boolean;
  deleteError: Error | null;
  refreshUser: () => void;
  logout: () => void;
  // login: ({username: string, password: string}) => void;
  login: ({ username, password }: { username: string, password: string }) => void;
  registerNew: ({ username, password }: { username: string, password: string }) => void;
  deleteYourself: () => void;
  theme: string;
  defaultTheme: string;
  btnColor: string;
}


export const UserContext = createContext<UserContextProps>({} as UserContextProps);

