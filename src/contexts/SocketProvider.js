import React, { useContext, useEffect, useState } from 'react';

const SocketContext = React.createContext();

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({id, children}) {
    const [socket, setSocket] = useState();

    useEffect(() => {
        const newSocket = io(
            'http://localhost:5000', 
            { query: { id }}
        )
        setSocket(newSocket);

        return () => newSocket.close
    })

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}