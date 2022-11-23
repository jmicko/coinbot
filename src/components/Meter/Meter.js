import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from '../../contexts/SocketProvider';
import './Meter.css'


function Meter(props) {
  // const dispatch = useDispatch();
  const [difference, setDifference] = useState(1);
  const [segmentMap, setSegmentMap] = useState();
  const socket = useSocket();
  // const tickers = useSelector((store) => store.statusReducer.tickers);

  useEffect(() => {
    // do not make these calculations unless there are props coming in
    if (props.max > 0 && props.min >= 0) {

      // let difference = (props.max - props.min).toFixed(0);
      setDifference((props.max - props.min).toFixed(0));
      let adjustedCurrent = socket.ticker.btc.price - props.min;

      // this is the important number
      let percentage = ((adjustedCurrent / difference) * 100).toFixed(0);

      // start an empty array to store the segments of the meter bar
      let segments = []
      for (let i = 0; i < 100; i++) {
        const element = i;
        segments.unshift({ id: i, percentage })
      }

      // use the array to map out segment components. They will just be stacked
      setSegmentMap(segments.map(seg => {
        return (
          <Segment key={seg.id} id={seg.id} percentage={seg.percentage} />
        )
      }))
    }
  }, [props, socket.ticker.btc.price])

  function Segment(props) {
    return (
      <div
      // compare the segment to the percentage, and set the background color accordingly
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
      {props.max > 0 && segmentMap}
    </div>
  )
}

export default Meter;