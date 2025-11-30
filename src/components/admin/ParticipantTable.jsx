import React from "react";

const ParticipantTable = () => {
  const sample = [
    {
      name: "Aarav",
      ageGroup: "U14",
      category: "Forward",
      level: "District",
      institution: "CIT",
    },
  ];

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>👥 Participants</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age Group</th>
            <th>Category</th>
            <th>Level</th>
            <th>Institution</th>
          </tr>
        </thead>

        <tbody>
          {sample.map((p, i) => (
            <tr key={i}>
              <td>{p.name}</td>
              <td>{p.ageGroup}</td>
              <td>{p.category}</td>
              <td>{p.level}</td>
              <td>{p.institution}</td>
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
  th: {
    background: "#7B5E57",
    color: "white",
    padding: "12px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #ddd",
  },
};

export default ParticipantTable;
