import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './Investment.css'


function Investment(props) {
  const dispatch = useDispatch();

  const [reinvest_ratio, setReinvest_ratio] = useState(0);
  const [bulk_pair_ratio, setBulk_pair_ratio] = useState(1.1);
  const [max_trade_size, setMaxTradeSize] = useState(30);

  // make sure ratio is within percentage range
  useEffect(() => {
    // if (reinvest_ratio > 500) {
    //   setReinvest_ratio(500)
    // }
    if (reinvest_ratio < 0) {
      setReinvest_ratio(0)
    }
  }, [reinvest_ratio]);

  useEffect(() => {
    setReinvest_ratio(props.store.accountReducer.userReducer.reinvest_ratio)
  }, [props.store.accountReducer.userReducer.reinvest_ratio])

  useEffect(() => {
    setMaxTradeSize(Number(props.store.accountReducer.userReducer.max_trade_size))
  }, [props.store.accountReducer.userReducer.max_trade_size])

  function reinvest(event) {
    // event.preventDefault();
    dispatch({
      type: 'REINVEST',
    });
  }

  function reinvestRatio(event) {
    event.preventDefault();
    dispatch({
      type: 'REINVEST_RATIO',
      payload: {
        reinvest_ratio: reinvest_ratio
      }
    });
  }

  function tradeMax(event) {
    // event.preventDefault();
    dispatch({
      type: 'TOGGLE_TRADE_MAX',
    });
  }

  function storeMaxTradeSize(event) {
    event.preventDefault();
    dispatch({
      type: 'STORE_MAX_TRADE_SIZE',
      payload: {
        max_trade_size: max_trade_size
      }
    });
  }

  function bulkPairRatio(event) {
    event.preventDefault();
    dispatch({
      type: 'SET_BULK_PAIR_RATIO',
      payload: {
        bulk_pair_ratio: bulk_pair_ratio
      }
    });
  }


  return (
    <div className="Investment scrollable">
      <div className="divider" />

      {/* REINVEST */}
      <h4>Reinvestment</h4>
      <p>Coinbot can try to reinvest your profits for you. Be aware that this may not
        work if the profit is too small.
      </p>
      {(props.store.accountReducer.userReducer.reinvest)
        ? <button className={`btn-blue medium ${props.theme}`} onClick={() => { reinvest() }}>Turn off</button>
        : <button className={`btn-blue medium ${props.theme}`} onClick={() => { reinvest() }}>Turn on</button>
      }
      {props.store.accountReducer.userReducer.reinvest &&
        <>
          {((reinvest_ratio > 100) || (props.store.accountReducer.userReducer.reinvest_ratio > 100)) &&
            <p>** WARNING! ** <br /> Setting the reinvestment ratio higher than 100% will take money from your available funds!
              You will need to keep an eye on the bot and make sure you don't run out!</p>
          }
          <p>Current reinvestment ratio: {props.store.accountReducer.userReducer.reinvest_ratio}%</p>
          <label htmlFor="reinvest_ratio">
            Set Ratio:
          </label>
          <input
            type="number"
            name="reinvest_ratio"
            value={reinvest_ratio}
            step={10}
            // max={200}
            required
            onChange={(event) => setReinvest_ratio(event.target.value)}
          />
          <br />
          <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={(event) => { reinvestRatio(event) }}>Save reinvestment ratio</button>
          <div className="divider" />
        </>
      }

      {/* MAX TRADE SIZE USD */}
      {/* only show if reinvest is also turned on */}
      {
        props.store.accountReducer.userReducer.reinvest &&
        <>
          <h4>Max Trade Size</h4>
          <p>
            Coinbot can try to limit the size of your trades. This is useful in case you want to
            stop reinvesting after a certain point, but keep reinvestment turned on for all other trades.
            Size cap is in USD. If set to 0, the bot will ignore it and default to the reinvestment ratio.
          </p>
          {(props.store.accountReducer.userReducer.max_trade)
            ? <button className={`btn-blue medium ${props.theme}`} onClick={() => { tradeMax() }}>Turn off</button>
            : <button className={`btn-blue medium ${props.theme}`} onClick={() => { tradeMax() }}>Turn on</button>
          }
          {props.store.accountReducer.userReducer.max_trade &&
            <>
              <p>Current max trade size: ${Number(props.store.accountReducer.userReducer.max_trade_size)}</p>
              <label htmlFor="reinvest_ratio">
                Set Max:
              </label>
              <input
                type="number"
                name="reinvest_ratio"
                value={max_trade_size}
                // step={10}
                // max={200}
                required
                onChange={(event) => setMaxTradeSize(Number(event.target.value))}
              />
              <br />
              <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={(event) => { storeMaxTradeSize(event) }}>Save Max</button>
              <div className="divider" />
            </>
          }
        </>
      }

      {/* BULK PERCENTAGE CHANGE */}
      <h4>Bulk Percentage Change</h4>
      <p>
        EXPERIMENTAL FEATURE. This will change the trade pair ratio for ALL trades to a uniform percentage. This can be useful for when your fees change due to trade volume and you want to change the ratio accordingly.
      </p>
      <>
        <label htmlFor="bulk_pair_ratio">
          New Ratio:
        </label>
        <input
          type="number"
          name="bulk_pair_ratio"
          value={bulk_pair_ratio}
          step={.1}
          max={100}
          min={0}
          required
          onChange={(event) => setBulk_pair_ratio(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-bulk-pair-ratio medium ${props.theme}`} onClick={(event) => { bulkPairRatio(event) }}>Set all trades to new ratio</button>
        <div className="divider" />
      </>

    </div>
  );
}

export default connect(mapStoreToProps)(Investment);