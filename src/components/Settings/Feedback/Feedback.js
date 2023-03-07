import React, { useState } from 'react';
import { useFetchData } from '../../../hooks/fetchData.js';
import { useUser } from '../../../contexts/UserContext.js';
import './Feedback.css'


function Feedback() {
  const { theme } = useUser();

  const {
    data: oldFeedback,
    createRefreshData: submitFeedback,
    deleteRefreshData: deleteFeedback
  } = useFetchData(`/api/settings/feedback`, { noLoad: false });

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
          <input type="text" name="Subject" placeholder="Subject" required onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })} />
        </label>
        <label>
          <textarea name="Description" placeholder="Description" required onChange={(e) => setFeedback({ ...feedback, description: e.target.value })} />
        </label>
        <input type="submit" value="Submit" className={`btn-green ${theme}`} />
      </form>


      <div className={`divider ${theme}`} />
      <h4>Previous Feedback</h4>
      <p>
        Here are your previous feedback submissions:
      </p>

      {/* display previous feedback submissions */}
      <div className="feedback-submissions">
        {oldFeedback && oldFeedback.map((feedback, i) => {
          return (
            <div className="feedback-submission" key={i}>
              <h5 className="feedback-submission-header">{feedback.subject}</h5>

              <p className="feedback-submission-body">
                {feedback.description}
              </p>

              <div className="feedback-submission-footer">
                <p>Submitted on: {feedback.created_at.slice(0, 10)}</p>
                {/* delete button */}
                <button className={`btn-red ${theme}`} onClick={() => deleteFeedback(feedback.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}


export default Feedback;