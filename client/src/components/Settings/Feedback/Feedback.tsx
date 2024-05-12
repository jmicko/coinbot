import { useMemo, useState } from 'react';
import './Feedback.css'
// import { useUser } from '../../../contexts/UserContext';
import useGetFetch from '../../../hooks/useGetFetch';
import usePostFetch from '../../../hooks/usePostFetch';
import useDeleteFetch from '../../../hooks/useDeleteFetch';
import { ChangeEventTypes, EventType } from '../../../types';
import { no } from '../../../shared';
import { useUser } from '../../../hooks/useUser';
import Collapser from '../../Collapser/Collapser';

interface Feedback {
  subject: string;
  description: string;
  created_at: string;
  id: number;
  username: string;
}


function Feedback() {
  const { user, theme } = useUser();

  const oldFeedbackOptions = useMemo(() => ({
    url: `/api/settings/feedback`,
    defaultState: [],
    from: 'oldFeedback in Feedback',
    preload: true,
  }), []);
  const {
    data: oldFeedback,
    refresh: refreshFeedback,
  } = useGetFetch(oldFeedbackOptions);
  const { postData: submitFeedback } = usePostFetch({
    url: `/api/settings/feedback`,
    refreshCallback: refreshFeedback,
    from: 'submitFeedback in Feedback',
  });
  const { deleteData: deleteFeedback } = useDeleteFetch({
    url: `/api/settings/feedback`,
    refreshCallback: refreshFeedback,
    from: 'deleteFeedback in Feedback',
  });

  const [feedback, setFeedback] = useState<{ subject: string, description: string }>({
    subject: '',
    description: ''
  });

  function handleSubmit(e: EventType) {
    no(e);
    console.log('feedback', feedback);
    submitFeedback(feedback);
    // clear inputs
    setFeedback({
      subject: '',
      description: ''
    });
  }

  function handleFeedbackChange(e: ChangeEventTypes) {
    no(e);
    // check to make sure the input is under 5000 characters
    if (e.target?.value.length > 5000) return;
    setFeedback({
      ...feedback,
      [e.target.name]: e.target.value
    });
  }

  return (
    <div className="Feedback settings-panel scrollable">

      {/* Feedback PROFIT */}
      <div className={`divider ${theme}`} />
      {/* <h4>Feedback</h4> */}
      <Collapser title='Submit Feedback'>
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
      </Collapser>


      <div className={`divider ${theme}`} />
      {/* <h4>History</h4> */}
      <Collapser title='Feedback History'>
        <p>
          Here are your previous feedback submissions:
        </p>

        {/* display previous feedback submissions */}
        <div className="feedback-submissions">
          {oldFeedback && oldFeedback.map((feedback: Feedback, i) => {

            const description: string = feedback.description;

            return (
              <div className="feedback-submission" key={i}>
                <h4 className="feedback-submission-header">{feedback.subject}</h4>
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
                  <button className={`btn-red ${theme}`} onClick={() => deleteFeedback('/' + feedback.id.toString())}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </Collapser>
      <div className={`divider ${theme}`} />
    </div>
  )
}


export default Feedback;