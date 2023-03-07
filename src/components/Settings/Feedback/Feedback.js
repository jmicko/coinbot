import React, { useState } from 'react';
import { useFetchData } from '../../../hooks/fetchData.js';
import { useUser } from '../../../contexts/UserContext.js';
import './Feedback.css'


function Feedback() {
  const { theme } = useUser();

  const { createData: submitFeedback } = useFetchData(`/api/settings/feedback`, { noLoad: true });

  const [feedback, setFeedback] = useState({
    subject: '',
    description: ''
  });

  function handleSubmit(e) {
    e.preventDefault();
    console.log('feedback', feedback);
    submitFeedback(feedback);
  }



  return (
    <div className="Feedback settings-panel scrollable">

      {/* Feedback PROFIT */}
      <div className={`divider ${theme}`} />
      <h4>Feedback</h4>
      <p>
        Have a suggestion or found a bug? Let us know!
      </p>

      {/* form with inputs to submit feedback */}
      <form onSubmit={handleSubmit} className="feedback-form">
        <label>
          <input type="text" name="Subject" placeholder="Subject" onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })} />
        </label>
        <label>
          <textarea name="Description" placeholder="Description" onChange={(e) => setFeedback({ ...feedback, description: e.target.value })} />
        </label>
        <input type="submit" value="Submit" className={`btn-green ${theme}`} />
      </form>


      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Feedback;