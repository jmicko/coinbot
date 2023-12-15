import React, { useState } from 'react';
import { useFetchData } from '../../../hooks/fetchData.js';
import { useUser } from '../../../contexts/UserContext.js';
import './Feedback.css'


function Feedback() {
  const { user, theme } = useUser();

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
    // clear inputs
    setFeedback({
      subject: '',
      description: ''
    });
  }

  function handleFeedbackChange(e) {
    e.preventDefault();
    // check to make sure the input is under 5000 characters
    if (e.target.value.length > 5000) return;
    setFeedback({
      ...feedback,
      [e.target.name]: e.target.value
    });
  }

  return (
    <div className="Feedback settings-panel scrollable">

      {/* Feedback PROFIT */}
      <div className={`divider ${theme}`} />
      <h4>Feedback</h4>
      <p>
        Have a suggestion or found a bug? Let us know!
      </p>
      <p>
        You can leave up to 5 feedback submissions at a time, and there is a limit of 5000 characters.
        Feedback will be sent to the site admin, and will include your username.
        No other information will be automatically sent,
        so if you have an issue specific to a device or browser etc, please include that in the description.
      </p>
      {/* form with inputs to submit feedback */}
      {(oldFeedback && oldFeedback.length < 5) || user.admin ?
        <form onSubmit={handleSubmit} className="feedback-form">
          <label>
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              required
              value={feedback.subject}
              onChange={handleFeedbackChange} />
          </label>
          <label>
            <textarea
              name="description"
              placeholder="Description"
              required
              value={feedback.description}
              onChange={handleFeedbackChange} />
          </label>
          <input type="submit" value="Submit" className={`btn-green ${theme}`} />
        </form>
        :
        <p>
          <i>You have reached the maximum number of feedback submissions.
            Please delete some before submitting more.</i>
        </p>
      }


      <div className={`divider ${theme}`} />
      <h4>History</h4>
      <p>
        Here are your previous feedback submissions:
      </p>

      {/* display previous feedback submissions */}
      <div className="feedback-submissions">
        {oldFeedback && oldFeedback.map((feedback, i) => {

          const description = feedback.description

          return (
            <div className="feedback-submission" key={i}>
              <h5 className="feedback-submission-header">{feedback.subject}</h5>

              {/* display description as paragraph, adding a line break where needed */}
              {/* <p className="feedback-submission-description">
                {description}
              </p> */}
              <p className="feedback-submission-description">
                {description.split('\n').map((line, i) => {
                  return (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  )
                })}
              </p>


              <div className="feedback-submission-footer">
                <p>Submitted on: {feedback.created_at.slice(0, 10)}</p>
                {/* if user is admin, show who submitted the feedback */}
                {user.admin && <p>Submitted by: {feedback.username}</p>}
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