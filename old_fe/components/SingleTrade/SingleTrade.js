import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.js';
import { useUser } from '../../contexts/UserContext.js';
import { useProductDecimals } from '../../hooks/useProductDecimals.js';
import './SingleTrade.css';
import { devLog } from '../../shared.js';

function SingleTrade(props) {
  const { user, theme } = useUser();
  const { productID, deleteOrder, syncPair } = useData();

  const [profit, setProfit] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sellFee, setSellFee] = useState();
  const [buyFee, setBuyFee] = useState();

  const { reorder } = props.order;

  devLog('reorder', reorder);

  const decimals = useProductDecimals(productID, user.availableFunds);

  // decimals.baseIncrement

  useEffect(() => {
    // devLog('rendering single trade');
    // calculate all the numbers when the component renders

    // pull from props and make more manageable
    let original_sell_price = props.order.original_sell_price;
    let base_size = props.order.base_size;
    let original_buy_price = props.order.original_buy_price;
    let maker_fee_rate = user.maker_fee;

    // calculate fees
    let sellFee = (maker_fee_rate * original_sell_price * base_size)
    let buyFee = (maker_fee_rate * original_buy_price * base_size)

    // calculate profits
    const profit = Math.round((((original_sell_price * base_size - original_buy_price * base_size)) - (buyFee + sellFee)) * decimals.base_inverse_increment) / decimals.base_inverse_increment;
    setProfit(profit);
    setBuyFee(buyFee)
    setSellFee(sellFee)
  }, [props.order.original_sell_price, props.order.original_buy_price, props.order.base_size, user.maker_fee, decimals.base_inverse_increment]);

  function syncTrade() {
    syncPair({
      order_id: props.order.order_id,
    })
  }

  function toggleShowAll() {
    setShowAll(!showAll);
  }

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    // this will work in safari once lookbehind is supported
    // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    // for now, use this
    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // todo - probably need to refactor this thing asap. Should use more useState hooks to make these strings a bit less horrifying
  // postgres is much better at math using exact

  return (
    <div className={`Single-trade ${props.order.side} ${user.theme}`}>
      {/* {JSON.stringify(decimals)} */}
      {!props.preview && <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={toggleShowAll}>{showAll ? <>&#9650;</> : <>&#9660;</>}</button>}
      {showAll && <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={syncTrade}>sync</button>}

      <div className={"overlay"}>


        {/* <p className="single-trade-text" > */}
        <div>
          {/* {JSON.stringify(user.theme)} */}
          <strong>
            {/* Price: */}
            {(props.order.side === 'BUY')
              ? 'Buy: '
              : 'Sell: '
            }
          </strong>
          {(props.order.side === 'SELL')
            ? numberWithCommas(Number(props.order.original_sell_price).toFixed(decimals.quote_increment_decimals))
            : numberWithCommas(Number(props.order.original_buy_price).toFixed(decimals.quote_increment_decimals))
          }
        </div>

        <div>
          <strong>
            {(props.order.side === 'SELL')
              ? 'Buy: '
              : 'Sell: '
            }
          </strong>
          {(props.order.side === 'SELL')
            ? numberWithCommas(Number(props.order.original_buy_price).toFixed(decimals.quote_increment_decimals))
            : numberWithCommas(Number(props.order.original_sell_price).toFixed(decimals.quote_increment_decimals))
          }
        </div>

        <div>
          <strong>Size: </strong>{Number(props.order.base_size).toFixed(decimals.base_increment_decimals)}{!props.preview && <></>}
        </div>

        {/* {!props.preview ? <strong> /</strong > : <strong> /</strong >} */}
        <div>
          <strong>Value: </strong>
          ${numberWithCommas((
            Math.round((props.order.limit_price * props.order.base_size) * decimals.quote_inverse_increment)
            / decimals.quote_inverse_increment).toFixed(decimals.quote_increment_decimals))}
        </div>


        <div>
          <strong>Profit</strong> ${profit.toFixed(3)}
        </div>

        <div><strong> Pair Increase:</strong> {Number(props.order.trade_pair_ratio)}%</div>

        <div>
          <strong>Time: </strong>
          {!props.preview && <strong></strong>}{!props.preview && (props.order.flipped_at
            ? new Date(props.order.flipped_at).toLocaleString('en-US')
            : new Date(props.order.created_at).toLocaleString('en-US'))}
          <span className={`${theme} ${reorder ? 'blue' : 'green'}`}> &#x2022;</span>
        </div>




        {
          showAll && !deleting && <div><strong>Buy Fees:</strong> {buyFee.toFixed(8)}</div>
        }
        {
          showAll && !deleting && <div><strong>Sell Fees:</strong> {sellFee.toFixed(8)}</div>
        }
        {
          showAll && !deleting && <div><strong>Total Fees:</strong> {(Number(sellFee.toFixed(8)) + Number(buyFee.toFixed(8))).toFixed(8)}</div>
        }
        {
          showAll && !deleting && <div><strong>Gross Profit:</strong> {(props.order.original_sell_price * props.order.base_size - props.order.original_buy_price * props.order.base_size).toFixed(8)}</div>
        }
        {/* </p> */}
      </div>

      {(deleting === true)
        ? <p className="deleting">Deleting...</p>
        : !props.preview && !user.kill_locked && <button
          className={`btn-red kill-button ${user.theme}`}
          onClick={() => {
            deleteOrder(props.order.order_id);
            setDeleting(true)
          }}>
          Kill
        </button>

      }
    </div >
  )
}

export default SingleTrade;