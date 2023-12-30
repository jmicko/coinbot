import { useEffect, useState } from 'react';
import './SingleTrade.css';
import { SingleTradeProps } from '../../types';
import { useUser } from '../../hooks/useUser.js';
import { useData } from '../../hooks/useData.js';
import useDeleteFetch from '../../hooks/useDeleteFetch.js';
import { numberWithCommas } from '../../shared.js';


function SingleTrade(props: SingleTradeProps) {
  const { user, theme } = useUser();
  const { currentProduct, pqd, pbd, refreshOrders, syncPair } = useData();

  const [profit, setProfit] = useState<number>(0);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [sellFee, setSellFee] = useState<number>(1);
  const [buyFee, setBuyFee] = useState<number>(1);
  const orderID = 'order_id' in props.order ? props.order.order_id : '';

  const { deleteData: deleteOrder } = useDeleteFetch({ url: `/api/orders/${orderID}`, from: 'deleteOrder in data context' });

  const deleteRefresh = async () => {
    await deleteOrder();
    refreshOrders();
    setDeleting(false);
  }

  const { reorder } = 'reorder' in props.order ? props.order : { reorder: false };

  // constants
  const original_sell_price = props.order.original_sell_price;
  const base_size = props.order.base_size;
  const original_buy_price = props.order.original_buy_price;
  const maker_fee_rate = user.maker_fee;
  const side = props.order.side;
  const created_at = 'created_at' in props.order ? props.order.created_at : '';
  const flipped_at = 'flipped_at' in props.order ? props.order.flipped_at : '';
  const limit_price = props.order.limit_price;
  const trade_pair_ratio = props.order.trade_pair_ratio;
  const order_id = 'order_id' in props.order ? props.order.order_id : '';


  useEffect(() => {
    // calculate all the numbers when the component renders
    // calculate fees
    const sellFee = (maker_fee_rate * original_sell_price * base_size)
    const buyFee = (maker_fee_rate * original_buy_price * base_size)

    // calculate profits
    const profit = Math.round((((original_sell_price * base_size - original_buy_price * base_size)) - (buyFee + sellFee)) * currentProduct.base_inverse_increment) / currentProduct.base_inverse_increment;
    setProfit(profit);
    setBuyFee(buyFee)
    setSellFee(sellFee)
  }, [original_sell_price, original_buy_price, base_size, user.maker_fee, currentProduct.base_inverse_increment, maker_fee_rate]);

  function syncTrade() {
    syncPair({
      order_id: 'order_id' in props.order ? order_id : props.key?.toString() || '',
    })
  }

  function toggleShowAll() {
    setShowAll(!showAll);
  }

  // todo - probably need to refactor this thing asap. Should use more useState hooks to make these strings a bit less horrifying
  // postgres is much better at math using exact

  return (
    <div className={`Single-trade ${side} ${user.theme}`}>

      {/* {JSON.stringify(decimals)} */}
      {!props.preview &&
        <button
          className={`btn-blue expand-single-trade ${user.theme}`}
          onClick={toggleShowAll}
        >{showAll ? <>&#9650;</> : <>&#9660;</>}</button>}
      {showAll && !props.preview &&
        <button
          className={`btn-blue expand-single-trade ${user.theme}`}
          onClick={syncTrade}
        >sync</button>}

      <div className={"overlay"}>
        <div>
          <strong>
            {/* Price: */}
            {(side === 'BUY')
              ? 'Buy: '
              : 'Sell: '
            }
          </strong>
          {(side === 'SELL')
            ? numberWithCommas(Number(original_sell_price).toFixed(pqd))
            : numberWithCommas(Number(original_buy_price).toFixed(pqd))
          }
        </div>

        <div>
          <strong>
            {(side === 'SELL')
              ? 'Buy: '
              : 'Sell: '
            }
          </strong>
          {(side === 'SELL')
            ? numberWithCommas(Number(original_buy_price).toFixed(pqd))
            : numberWithCommas(Number(original_sell_price).toFixed(pqd))
          }
        </div>

        <div>
          <strong>Size: </strong>{Number(base_size).toFixed(pbd)}{!props.preview && <></>}
        </div>

        <div>
          <strong>Value: </strong>
          ${numberWithCommas((
            Math.round((limit_price * base_size) * currentProduct.quote_inverse_increment)
            / currentProduct.quote_inverse_increment).toFixed(pqd))}
        </div>

        <div><strong>Profit</strong> ${profit.toFixed(3)}</div>

        <div><strong> Pair Increase:</strong> {Number(trade_pair_ratio)}%</div>

        {!props.preview && <div>
          <strong>Time: </strong>
          {!props.preview && <strong></strong>}{!props.preview
            && 'flipped_at' in props.order
            && (flipped_at
              ? new Date(flipped_at).toLocaleString('en-US')
              : new Date(created_at).toLocaleString('en-US'))}
          <span className={`${theme} ${reorder ? 'blue' : 'green'}`}> &#x2022;</span>
        </div>}

        {showAll && !deleting && <>
          <div><strong>Buy Fees:</strong> {buyFee.toFixed(8)}</div>
          <div><strong>Sell Fees:</strong> {sellFee.toFixed(8)}</div>
          <div><strong>Total Fees:</strong> {(Number(sellFee.toFixed(8)) + Number(buyFee.toFixed(8))).toFixed(8)}</div>
          <div>
            <strong>Gross Profit:</strong>
            {(original_sell_price * base_size - original_buy_price * base_size).toFixed(8)}
          </div>
        </>}
      </div>

      {(deleting === true)
        ? <p className="deleting">Deleting...</p>
        : !props.preview && !user.kill_locked && <button
          className={`btn-red kill-button ${user.theme}`}
          onClick={() => {
            setDeleting(true)
            deleteRefresh();
          }}>
          Kill
        </button>

      }
    </div >
  )
}

export default SingleTrade;