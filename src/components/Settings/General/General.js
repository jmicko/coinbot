import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext.js';
import { useUser } from '../../../contexts/UserContext.js';
import './General.css'

const themes = { original: 'Original', darkTheme: 'Dark' }

function General(props) {
  const { user, theme } = useUser();
  const { pause, killLock, setTheme, sendTradeLoadMax, updateProfitAccuracy, sendSyncQuantity } = useData();

  const [max_trade_load, setMaxTradeLoad] = useState(100);
  const [profit_accuracy, setProfit_accuracy] = useState(2);
  const [sync_quantity, setSync_quantity] = useState(user.sync_quantity);

  return (
    <div className="General settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* THEME */}
      <h4>Theme</h4>
      {Object.keys(themes).map((theme) => {
        return (
          <button key={theme} className={`btn-blue medium ${theme}`} onClick={() => { setTheme(theme) }}>
            {themes[theme]}
          </button>
        )
      })}
      <div className={`divider ${theme}`} />

      {/* KILL PREVENTION */}
      <h4>Kill Prevention</h4>
      {props.tips && <p>
        Removes the kill button from the trade pairs. 
        This helps prevent accidental deletion of trades. 
        Highly recommended to leave this on.
      </p>}
      <button className={`btn-blue medium ${user.theme}`} onClick={killLock}>{user.kill_locked ? 'Unlock' : 'Lock'}</button>
      {/* <button className={`btn-blue medium ${user.theme}`} onClick={killLock}>Lock</button> */}
      <div className={`divider ${theme}`} />

      {/* PAUSE */}
      <h4>Pause</h4>
      {props.tips && <p>
        Pauses the bot. Trades will stay in place, but the bot will not check on them or flip them. If they are cancelled on Coinbase, the bot will not notice until it is unpaused.
        Be careful not to trade funds away manually while the bot is paused, or there might be an insufficient funds error.
      </p>}
      {/* {user.paused
        ? <button className={`btn-blue medium ${user.theme}`} onClick={pause}>Unpause</button>
        : <button className={`btn-blue medium ${user.theme}`} onClick={pause}>Pause</button>
      } */}
      <button className={`btn-blue medium ${user.theme}`} onClick={pause}>{user.paused ? 'Unpause' : 'Pause'}</button>
      <div className={`divider ${theme}`} />

      {/* MAX TRADES ON SCREEN */}
      <h4>Max Trades on Screen</h4>
      {props.tips && <div>
      <p>
        Limit the number of trades to load per side (buy/sell). 
        This can make load times shorter and limit the amount of scrolling
        needed to get to the split.
      </p>
      <p>
        Since it is PER SIDE, setting the value to 10 for example 
        would potentially load up to 20 trades total.
      </p>
      <p>
        There is a soft limit of 10,000 open trades per user, 
        so there is no reason to set the value higher than that.
      </p>
      </div>}
      <p>Current max trades to load per side: {Number(user.max_trade_load)}</p>
      <div className='left-border'>
        <label htmlFor="reinvest_ratio">
          Set Max:
        </label>
        <input
          type="number"
          name="reinvest_ratio"
          value={max_trade_load}
          required
          onChange={(event) => setMaxTradeLoad(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendTradeLoadMax(max_trade_load) }}>Save Max</button>
      </div>
      <div className={`divider ${theme}`} />

      {/* SYNC TRADE QUANTITY */}
      <h4>Sync Trade Quantity</h4>
      {props.tips && <p>
        How many buys and sells to keep in sync with Coinbase. There is a hard limit of {user.botSettings.orders_to_sync} set
        by the admin. This is configurable because Coinbase has a limit of 500, and the bot needs to allow some margin. Setting 
        this to a higher number will make it easier to keep the price within the spread, but will slightly slow down the bot.
        The admin can set a max based on the hardware the bot is running on. You can choose your risk tolerance within that limit.
      </p>}
      <p>Current sync quantity: {Number(user.sync_quantity)} Max: {user.botSettings.orders_to_sync}</p>
      <div className='left-border'>
        <label htmlFor="sync_quantity">
          Set Sync Quantity:
        </label>
        <input
          type="number"
          name="sync_quantity"
          value={sync_quantity}
          required
          onChange={(event) => setSync_quantity(event.target.value)}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendSyncQuantity(sync_quantity) }}>Save</button>
      </div>
      <div className={`divider ${theme}`} />


      {/* PROFIT ACCURACY */}
      <h4>Profit accuracy</h4>
      {props.tips && <p>
        How many decimals to display on screen for profits.
      </p>}
      <p>Current accuracy: {Number(user.profit_accuracy)}</p>
      <div className='left-border'>
        <label htmlFor="profit_accuracy">
          Set Max:
        </label>
        <input
          type="number"
          name="profit_accuracy"
          value={profit_accuracy}
          required
          onChange={(event) => setProfit_accuracy(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={(event) => { updateProfitAccuracy(profit_accuracy) }}>Save</button>
      </div>
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default General;