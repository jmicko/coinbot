import React, { useEffect, useState, useCallback, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './Meter.css'


function TradeList(props) {
  const dispatch = useDispatch();

  // these will store mapped arrays as html so they can be used after page loads
  const [max, setMax] = useState(100);
  const [min, setMin] = useState(0);
  const [difference, setDifference] = useState(0);
  const [current, setCurrent] = useState(0);
  const [adjustedCurrent, setAdjustedCurrent] = useState(0);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    setCurrent(props.current);
    setDifference((props.max - props.min).toFixed(0));
    setAdjustedCurrent(props.current - props.min);
    let adjustedCurrent = props.current - props.min;

    setPercentage((adjustedCurrent / difference * 100).toFixed(0));
  }, [props])
  


  return (
    <div className="Meter">
      percentage : : : {percentage}
      <br />
      adjustedCurrent: {adjustedCurrent}
      <br />
      max: : : : : : : {max}
      <br />
      current: : : : : {current}
      <br />
      difference : : : {difference}
    </div>
  )
}

export default connect(mapStoreToProps)(TradeList);