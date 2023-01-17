import React from 'react';
import { useUser } from '../../../contexts/UserContext.js';
import './SettingsNav.css'


function SettingsNav(props) {
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
        {user.admin && <button className={`btn-nav ${theme} ${props.settingsPage === "admin" && "selected"}`} onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
    </div>
  );
}

export default SettingsNav;