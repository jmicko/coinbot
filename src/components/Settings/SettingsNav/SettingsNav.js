import React from 'react';
import { useData } from '../../../contexts/DataContext';
import './SettingsNav.css'


function SettingsNav(props) {
  const { user } = useData();

  return (
    <div className="SettingsNav">
      <center>
        <button className={`btn-nav ${props.settingsPage === "general" && "selected"}`} onClick={() => { props.setSettingsPage('general') }}>General</button>
        <button className={`btn-nav ${props.settingsPage === "products" && "selected"}`} onClick={() => { props.setSettingsPage('products') }}>Products</button>
        <button className={`btn-nav ${props.settingsPage === "investment" && "selected"}`} onClick={() => { props.setSettingsPage('investment') }}>Investment</button>
        <button className={`btn-nav ${props.settingsPage === "autoSetup" && "selected"}`} onClick={() => { props.setSettingsPage('autoSetup') }}>Auto Setup</button>
        <button className={`btn-nav ${props.settingsPage === "bulkDelete" && "selected"}`} onClick={() => { props.setSettingsPage('bulkDelete') }}>Bulk Delete</button>
        <button className={`btn-nav ${props.settingsPage === "history" && "selected"}`} onClick={() => { props.setSettingsPage('history') }}>History</button>
        <button className={`btn-nav ${props.settingsPage === "reset" && "selected"}`} onClick={() => { props.setSettingsPage('reset') }}>Reset</button>
        {user.admin && <button className={`btn-nav ${props.settingsPage === "admin" && "selected"}`} onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
    </div>
  );
}

export default SettingsNav;