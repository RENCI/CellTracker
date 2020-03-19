import React from "react";
import PropTypes from "prop-types";

const testData = [];

for (let i = 0; i < 20; i++) {
  testData.push({
    username: "username_" + i,
    total_score: Math.floor(Math.random() * 300)
  });
}

const Leaderboard = props => {
  const username = props.userInfo.username;
  const users = testData.concat(props.userInfo);

  const rows = users.sort((a, b) => {
    return b.total_score - a.total_score;
  }).map((d, i) => {
    const active = d.username === username;

    return (
      <tr key={i} className={ active ? "table-primary" : null }>
        <td>{ d.username }</td>
        <td>{ d.total_score }</td>
        <td>{ i + 1 }</td>
      </tr>
    );
  });

  return (
    <div className="offset-md-2 col-md-8 text-center mt-2">
      <h4>Leaderboard</h4>
      <table className="table">
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
