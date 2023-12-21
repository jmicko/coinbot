import './SettingsNav.css'
import { useUser } from '../../../contexts/useUser';


function SettingsNav(props: {
  settingsPage: string,
  setSettingsPage: (page: string) => void
}) {
  const { user, theme } = useUser();

  return (
    <div className="SettingsNav">
      <center>
        <button className={`btn-nav ${theme} ${props.settingsPage === "general" && "selected"}`} onClick={() => { props.setSettingsPage('general') }}>General</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "products" && "selected"}`} onClick={() => { props.setSettingsPage('products') }}>Products</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "investment" && "selected"}`} onClick={() => { props.setSettingsPage('investment') }}>Investment</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "autoSetup" && "selected"}`} onClick={() => { props.setSettingsPage('autoSetup') }}>Auto Setup</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "bulkDelete" && "selected"}`} onClick={() => { props.setSettingsPage('bulkDelete') }}>Bulk Delete</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "history" && "selected"}`} onClick={() => { props.setSettingsPage('history') }}>History</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "reset" && "selected"}`} onClick={() => { props.setSettingsPage('reset') }}>Reset</button>
        <button className={`btn-nav ${theme} ${props.settingsPage === "feedback" && "selected"}`} onClick={() => { props.setSettingsPage('feedback') }}>Feedback</button>
        {user.admin && <button className={`btn-nav ${theme} ${props.settingsPage === "admin" && "selected"}`} onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
      {/* <div className={`divider ${theme}`} />
      <br /> */}
      {/* todo - need to put something small here to break up the space visually */}
    </div>
  );
}

export default SettingsNav;