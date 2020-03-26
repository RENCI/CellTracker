import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const normalAlert = "alert-secondary";
const updateAlert = "alert-primary"; 
const timeOut = 2000;
let timer;

const Score = props => {
  const [scoreLabel, setScoreLabel] = useState("Score");
  const [timeStamp, setTimeStamp] = useState(null);
  const [alertType, setAlertType] = useState(normalAlert);
  
  useEffect(() => {
    if (props.settings.scoring) {
      setScoreLabel("Scoring");

      timer = setInterval(() => {
        setScoreLabel(scoreLabel => scoreLabel === "Scoring..." ? "Scoring" : scoreLabel + ".");
      }, 500);
    }
    else {      
      clearInterval(timer);

      setScoreLabel("Score");
    }

    return () => clearInterval(timer);
  }, [props.settings.scoring]);
  
  useEffect(() => {  
    

    if (props.userInfo.score_time_stamp !== timeStamp) {
      let timer;

      if (timeStamp !== null) {      
        setAlertType(updateAlert);

        timer = setTimeout(() => {
          setAlertType(normalAlert);
        }, timeOut);
      }

      setTimeStamp(props.userInfo.score_time_stamp);

      return () => clearTimeout(timer);
    }
  }, [props.userInfo.score_time_stamp]);

  const score = props.userInfo.score ? props.userInfo.score : 0;
  const totalScore = props.userInfo.total_score ? props.userInfo.total_score : 0;

  const className = "alert " + alertType;

  return (
    <>    
      <h4>{ scoreLabel }</h4>
      <div className={ className }>Last region score: <strong>{ score }</strong></div>
      <div className={ className }>Total score: <strong>{ totalScore }</strong></div>
    </>
  );
}

Score.propTypes = {
  experiment: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired
};

export default Score;
