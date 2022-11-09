import React, { useEffect, useState, useCallback, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './Meter.css'


function Meter(props) {
  const dispatch = useDispatch();

  // these will store mapped arrays as html so they can be used after page loads
  const [max, setMax] = useState(100);
  const [min, setMin] = useState(0);
  const [difference, setDifference] = useState(1);
  const [current, setCurrent] = useState(0);
  const [adjustedCurrent, setAdjustedCurrent] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [segmentMap, setSegmentMap] = useState();

  useEffect(() => {
    setCurrent(props.current);
    // do not make these calculations unless there are props coming in
    if (props.max > 0 && props.min > 0) {

      setDifference((props.max - props.min).toFixed(0));
      let adjustedCurrent = props.current - props.min;
      setAdjustedCurrent(adjustedCurrent.toFixed(2));

      // this is the important number
      let percentage = ((adjustedCurrent / difference) * 100).toFixed(0);
      setPercentage(percentage);

      let segments = []
      for (let i = 0; i < 100; i++) {
        const element = i;
        segments.unshift({ id: i, percentage })
      }
      // console.log(segments);
      setSegmentMap(segments.map(seg => {
        return (
          <Segment key={seg.id} id={seg.id} percentage={seg.percentage} />
        )
      }))
    }
  }, [props])

  function Segment(props) {
    // const [active, setActive] = useState(false);

    // useEffect(() => {


    // }, [])



    return (
      <div
        className={
          props.id < props.percentage
            ? "black-segment segment"
            : "white-segment segment"
        }
      >
      </div>
    )
  }



  return (
    <div className="Meter">
      {segmentMap}
      {/* <Segment id={5} percentage={percentage} /> */}
    </div>
  )
}

export default connect(mapStoreToProps)(Meter);