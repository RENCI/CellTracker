import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const normalAlert = "alert-secondary";
const updateAlert = "alert-primary"; 
const timeOut = 2000;

const Score = props => {
  const [timeStamp, setTimeStamp] = useState(null);
  const [alertType, setAlertType] = useState(normalAlert);
  
  useEffect(() => {
    if (props.userInfo.score_time_stamp !== timeStamp) {
      if (timeStamp !== null) {      
        setAlertType(updateAlert);

        setTimeout(() => {
          setAlertType(normalAlert);
        }, timeOut);
      }

      setTimeStamp(props.userInfo.score_time_stamp);
    }
  }, [props.userInfo.score_time_stamp]);

  const score = props.userInfo.score ? props.userInfo.score : 0;
  const totalScore = props.userInfo.total_score ? props.userInfo.total_score : 0;

  const className = "alert " + alertType;

  return (
    <>
      <div className={ className }>Last region score: <strong>{ score }</strong></div>
      <div className={ className }>Total score: <strong>{ totalScore }</strong></div>
    </>
  );
}

Score.propTypes = {
  experiment: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired
};

export default Score;
