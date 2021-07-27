import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './SingleTrade.css'

function SingleTrade(props) {
  const dispatch = useDispatch();
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    if (props.store.accountReducer == undefined) {
      return
    }
    // this formula is ridiculous but hey, at least I didn't inject it right into the html, right?
    const profit = Math.round((((props.order.original_sell_price * props.order.size - props.order.original_buy_price * props.order.size)) - ((props.store.accountReducer.feeReducer.maker_fee_rate * props.order.original_buy_price * props.order.size)+(props.store.accountReducer.feeReducer.maker_fee_rate * props.order.original_sell_price * props.order.size))) * 100) / 100;
    setProfit(profit);
  }, [props.store.accountReducer]);

  // todo - probably need to refactor this thing asap. Should use more useState hooks to make these strings a bit less horrifying
  // postgres is much better at math using exact 

  return (
    <div className={`${props.order.side}`}>
      <p>
        <strong>
          {(props.order.side == 'sell')
            ? 'Sell'
            : 'Buy'
          } price </strong>
        {(props.order.side == 'sell')
          ? Number(props.order.original_sell_price)
          : Number(props.order.original_buy_price)
        } ~ <strong>
          {(props.order.side == 'sell')
            ? 'Buy'
            : 'Sell'
          } price </strong>
        {(props.order.side == 'sell')
          ? Number(props.order.original_buy_price)
          : Number(props.order.original_sell_price)
        } ~
        <strong>Size </strong>{Number(props.order.size)} ~
        <strong>Value</strong> ${Math.round((props.order.price * props.order.size) * 100) / 100} ~
        <strong> Pair Profitability</strong> ${profit}
      </p>
    </div>
  )
}

export default connect(mapStoreToProps)(SingleTrade);