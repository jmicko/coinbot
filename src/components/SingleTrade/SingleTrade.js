import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './SingleTrade.css'

function SingleTrade(props) {
  const dispatch = useDispatch();
  const [profit, setProfit] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sellFee, setSellFee] = useState();
  const [buyFee, setBuyFee] = useState();

  useEffect(() => {
    // calculate all the numbers when the component renders

    // pull from props and make more manageable
    let original_sell_price = props.order.original_sell_price;
    let size = props.order.size;
    let original_buy_price = props.order.original_buy_price;
    let maker_fee_rate = props.store.accountReducer.feeReducer.maker_fee_rate;

    // calculate fees
    let sellFee = (maker_fee_rate * original_sell_price * size)
    let buyFee = (maker_fee_rate * original_buy_price * size)

    // calculate profits
    const profit = Math.round((((original_sell_price * size - original_buy_price * size)) - (buyFee + sellFee)) * 100000000) / 100000000;
    setProfit(profit);
    setBuyFee(buyFee)
    setSellFee(sellFee)
  }, [props.store.accountReducer, props.order.original_sell_price, props.order.original_buy_price, props.order.size]);

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteOrder() {
    console.log('clicked delete');
    setDeleting(true)
    dispatch({
      type: 'DELETE_TRADE', payload: {
        id: props.order.id,
      }
    })
  }

  function toggleShowAll() {
    console.log('show all details', props.order);
    setShowAll(!showAll);
  }

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  }

  // todo - probably need to refactor this thing asap. Should use more useState hooks to make these strings a bit less horrifying
  // postgres is much better at math using exact

  return (
    <div className={`Single-trade ${props.order.side} ${props.theme}`}>
      <div className={"overlay"}>
        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <>
            <button className={`btn-red ${props.theme}`} onClick={() => { deleteOrder() }}>Kill</button>
            {showAll
              ? <button className={`btn-blue ${props.theme}`} onClick={toggleShowAll}>&#9650;</button>
              : <button className={`btn-blue ${props.theme}`} onClick={toggleShowAll}>&#9660;</button>
            }
          </>
        }
        <p className="single-trade-text" >
          {/* {JSON.stringify(props.theme)} */}
          <strong>
            Price: </strong>
          {(props.order.side === 'sell')
            ? numberWithCommas(Number(props.order.original_sell_price).toFixed(2))
            : numberWithCommas(Number(props.order.original_buy_price).toFixed(2))
          } <strong>
            {(props.order.side === 'sell')
              ? '~Buys:'
              : '~Sells:'
            } </strong>
          {(props.order.side === 'sell')
            ? numberWithCommas(Number(props.order.original_buy_price).toFixed(2))
            : numberWithCommas(Number(props.order.original_sell_price).toFixed(2))
          } ~<strong>Size </strong>{Number(props.order.size).toFixed(8)} ~
          <strong>Value</strong> ${numberWithCommas((Math.round((props.order.price * props.order.size) * 100) / 100).toFixed(2))} ~
          <strong>Pair Profit</strong> ${profit.toFixed(8)}
          <strong> ~Time</strong> {new Date(props.order.created_at).toLocaleString('en-US')}
          {/* {JSON.stringify(props.order)} */}
          {
            showAll && !deleting && <><strong> Pair Ratio:</strong> {Number(props.order.trade_pair_ratio)}</>
          }
          {
            showAll && !deleting && <><strong> Buy Fees:</strong> {buyFee.toFixed(8)}</>
          }
          {
            showAll && !deleting && <><strong> Sell Fees:</strong> {sellFee.toFixed(8)}</>
          }
          {
            showAll && !deleting && <><strong> Total Fees:</strong> {(Number(sellFee.toFixed(8)) + Number(buyFee.toFixed(8))).toFixed(8)}</>
          }
          {
            showAll && !deleting && <><strong> Gross Pair Profit:</strong> {(props.order.original_sell_price * props.order.size - props.order.original_buy_price * props.order.size).toFixed(8)}</>
          }
        </p>
      </div>
    </div>
  )
}

export default connect(mapStoreToProps)(SingleTrade);