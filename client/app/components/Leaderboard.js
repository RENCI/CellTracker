import React from "react";
import PropTypes from "prop-types";

const Leaderboard = props => {
  const username = props.userInfo.username;

  const users = props.userInfo.allUsers ? Object.keys(props.userInfo.allUsers).map(key => {
    return {
      username: key,
      score: props.userInfo.allUsers[key]
    };
  }) : [];

  users.sort((a, b) => {
    return a.score === b.score ? a.username.localeCompare(b.username) :
      b.score - a.score;
  });

  let rank = 1;
  let rankCount = 0;
  users.forEach((user, i, a) => {
    if (i === 0 || user.score === a[i - 1].score) {
      user.rank = rank;
      rankCount++;
    }
    else {
      rank += rankCount;      
      user.rank = rank;
      rankCount = 1;
    }
  });

  const rows = users.map((d, i) => {
    const active = d.username === username;

    return (
      <tr key={i} className={ active ? "table-primary" : null }>
        <td>{ d.username }</td>
        <td>{ d.score }</td>
        <td>{ d.rank }</td>
      </tr>
    );
  });

  return (
    <div className="offset-md-2 col-md-8 text-center mt-2">
      <h4>Leaderboard</h4>
      <table className="table table-striped">
        <thead>
          <tr>
            <th scope="col">Username</th>
            <th scope="col">Score</th>
            <th scope="col">Rank</th>
          </tr>
        </thead>
        <tbody>
          { rows }
        </tbody>
      </table>
    </div>
  );
}

Leaderboard.propTypes = {
  userInfo: PropTypes.object.isRequired
};

export default Leaderboard;
