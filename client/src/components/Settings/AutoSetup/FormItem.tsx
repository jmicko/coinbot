import { useData } from "../../../contexts/useData";
import { useUser } from "../../../contexts/useUser";

export default function FormItem(props: {
  label: string,
  value: string | number | boolean,
  type: string,
  changeCallback: (e:  React.ChangeEvent<HTMLInputElement>) => void,
  checked?: boolean,
  hidden?: boolean,
  tips?: {[key: string]: string}
}) {
  const { user } = useUser();
  const { productID } = useData();
  const baseID = user.availableFunds?.[productID]?.base_currency;
  const quoteID = user.availableFunds?.[productID]?.quote_currency;
  // const name = props.label.toLowerCase().replace(/ /g, '_')
  const name = props.label.split(' ').map((word, index) =>
    index === 0
      ? word.toLowerCase()
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
  const value = typeof props.value === 'boolean' ? props.value.toString() : props.value;
  const type = props.type === 'first-radio' ? 'radio' : props.type;
  // tip is the value in the tips object with the same key as the name
  const tip = props.tips && props.tips[name];

  return (
    <>
      {tip && <p className="tip">{tip}</p>}
      <label
        className={`${type === 'radio' ? 'radio-button' : ''} ${props.hidden ? 'hidden' : ''}`}
        // className="left-border"
        htmlFor={name}
      >
        {props.type !== 'radio' && type !== 'checkbox' && props.label + ':'}
        {type !== 'checkbox' && <br />}
        <input
          onChange={(e) => {
            props.changeCallback(e);
          }}
          value={value}
          type={type}
          name={name}
          // if type is radio, then checked is true if value is equal to the checked value
          checked={props.checked}
        />
        {type === 'radio'
          && (value === 'quote'
            ? quoteID
            : value === 'base'
              ? baseID
              : value)
        }
        {type === 'checkbox' && props.label}
      </label>
    </>
  )
}