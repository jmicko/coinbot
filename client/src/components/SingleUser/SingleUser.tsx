import { useMemo, useState } from 'react';
// import Confirm from '../Confirm/Confirm.js';
import './SingleUser.css'
import usePutFetch from '../../hooks/usePutFetch';
import { User } from '../../types/index.js';
import useDeleteFetch from '../../hooks/useDeleteFetch';
import useGetFetch from '../../hooks/useGetFetch';
import Confirm from '../Confirm/Confirm';
import { useUser } from '../../hooks/useUser.js';

function SingleUser(props: { user: User, key: number, refreshUsers: () => void }) {
  // IMPORTANT to not that this is the user from the context, not the user from the props
  // This is the user that is logged in
  const { user } = useUser();
  const { deleteData: deleteUser } = useDeleteFetch({
    url: `api/admin/users/${props.user.id}`,
    from: 'deleteUser in SingleUser',
    refreshCallback: props.refreshUsers,
  });

  // const { putData: approveUser }
  //   = usePutFetch({
  //     url: 'api/admin/users',
  //     from: 'approveChat in Admin',
  //     refreshCallback: props.refreshUsers,
  //   });

  // const approveUserChat = () => { props.approveUserChat({ id: props.user.id, chatPermission: !props.user.can_chat }) };

  const { putData: approveChat }
    = usePutFetch({
      url: 'api/admin/users/chat',
      from: 'approveChat in SingleUser',
      refreshCallback: props.refreshUsers,
    });

  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // functions passed in from the parent
  // const deleteUser = () => deleteUser(props.user.id);
  // const approveUser = () => {
  //   setApproving(true);
  //   props.approveUser({ id: props.user.id })
  // };
  const { putData: approveUser } = usePutFetch({
    url: 'api/admin/users',
    from: 'approveUser in SingleUser',
    refreshCallback: props.refreshUsers,
  });

  // debugData is just a json string maybe?
  // looks like this:

  // const sample = {
  //   "userID": 2,
  //   "username": "user",
  //   "admin": false,
  //   "active": false,
  //   "approved": false,
  //   "paused": false,
  //   "joined_at": "2023-12-17T18:09:22.935Z",
  //   "kill_locked": false,
  //   "theme": "original",
  //   "reinvest": false,
  //   "reinvest_ratio": 0,
  //   "post_max_reinvest_ratio": 0,
  //   "reserve": "0.00000000",
  //   "maker_fee": "0.00000000",
  //   "taker_fee": "0.00000000",
  //   "usd_volume": "0.00000000",
  //   "availableFunds": {},
  //   "max_trade": false,
  //   "max_trade_size": "0.00000000",
  //   "max_trade_load": 100,
  //   "sync_quantity": 100,
  //   "profit_accuracy": 16,
  //   "auto_setup_number": 1,
  //   "profit_reset": "2023-12-17T18:09:22.935Z",
  //   "can_chat": true,
  //   "botStatus": ["begin main loop"],
  //   "willCancel": {}, "ordersToCheck": [],
  //   "loopNumber": 1552,
  //   "deleting": false,
  //   "socketStatus": "closed",
  //   "candlesBeingUpdated": {},
  //   "exporting": false,
  //   "simulating": false,
  //   "simulationResults": null
  // }
  // but we only need the botStatus array and loopNumber for now

  interface DebugData {
    botStatus: string[];
    loopNumber: number;
  }

  const debugOptions = useMemo(() => ({
    url: `api/admin/debug/${props.user.id}`,
    defaultState: { botStatus: [], loopNumber: 0 },
    preload: false,
    from: 'debug in SingleUser',
  }), []);
  const {
    data: debugData,
    refresh: debug
  } = useGetFetch<DebugData>(debugOptions);


  function toggleShowAll() {
    setShowAll(!showAll);
  }


  function cancelDeleteUser() {
    setDeleting(false)
  }

  function confirmDelete() {
    setDeleting(true)
  }

  return (
    <div className={`Single-trade`}>
      <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={toggleShowAll}>{showAll ? <>&#9650;</> : <>&#9660;</>}</button>
      {showAll && <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={debug}>debug</button>}
      {deleting && <Confirm execute={() => { deleteUser() }} ignore={cancelDeleteUser} />}
      <div className={"overlay"}>
        {/* Delete a user */}
        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <button className="btn-red deleting" onClick={() => { confirmDelete() }}>Delete</button>
        }
        {/* ddd{props.user.can_chat ? 'chat' : "no"}chat */}
        {/* Approve a user */}
        {!deleting && ((props.user.approved)
          ? <p className="deleting">Approved</p>
          : (approving === true)
            ? <p className="deleting">Approving...</p>
            : <button className="btn-green deleting" onClick={() => { setApproving(true); approveUser({ id: props.user.id }) }}>Approve</button>)
        }
        {/* Enable chat for a user */}
        {/* {JSON.stringify(props.user)} */}
        {(props.user.can_chat
          ? <button
            className="btn-red deleting"
            onClick={() => {
              approveChat({
                id: props.user.id,
                chatPermission: !props.user.can_chat
              })
            }}
          >
            Remove Chat
          </button>
          : <button
            className="btn-green deleting"
            onClick={() => {
              approveChat({
                id: props.user.id,
                chatPermission: !props.user.can_chat
              })
            }}
          >
            Approve Chat
          </button>)
        }
        {/* User details */}
        <p className="single-trade-text">
          <strong>
            ID: </strong>
          {props.user.id}
          ~ <strong>
            Username: </strong>
          {props.user.username}
          ~ <strong>Active: </strong>
          {JSON.stringify(props.user.active)}
          {/* ~ <strong>Approved: </strong>{ }
          {JSON.stringify(props.user.approved)} */}
        </p>
      </div>
      {showAll &&
        <div className='user-info'>
          {/* BOT STATUS LIST */}
          <h4>User Bot Status</h4>
          <ol>
            <li>Loop #{debugData?.loopNumber}</li>
            {/* <p>{JSON.stringify(debugData)}</p> */}
            {debugData?.botStatus?.slice(0)?.reverse()?.map((statusItem, i = 1) => {
              i++
              return <li key={i}>{statusItem}</li>
            }) || <p>Click debug to get info. This will return a snapshot of the user, and does not update live.</p>}
          </ol>
          {/* <h4></h4> */}
        </div>
      }
    </div>
  )
}

export default SingleUser;