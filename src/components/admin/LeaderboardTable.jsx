import React from "react";

const LeaderboardTable = () => {
  const leaderboard = [
    { rank: 1, name: "Aarav", total: 48 },
    { rank: 2, name: "Diya", total: 46 },
  ];

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>🏆 Leaderboard</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Participant</th>
            <th>Total Score</th>
          </tr>
        </thead>

        <tbody>
          {leaderboard.map((p, i) => (
            <tr key={i}>
              <td>{p.rank}</td>
              <td>{p.name}</td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  ...basicAdminStyles,
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
  },
};

export default LeaderboardTable;
