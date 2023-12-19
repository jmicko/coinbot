import { useUser } from '../../contexts/useUser';
import './Confirm.css';

interface Props {
  text?: string;
  execute: () => void;
  ignore: () => void;
}

function Confirm(props: Props) {
  const { user } = useUser();
  return (
    <div className={`Confirm`}>
      <center>
        {props.text ? <p>{props.text}</p> : <p>Are you sure?</p>}
        <button className={`btn-green medium ${user.theme}`} onClick={props.execute}>Confirm</button>
        <button className={`btn-red medium ${user.theme}`} onClick={props.ignore}>Cancel</button>
      </center>
    </div>
  )
}

export default Confirm;