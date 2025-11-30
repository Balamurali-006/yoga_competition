import React, { useState } from "react";

const ScoringTemplateForm = () => {
  const [asanas, setAsanas] = useState([{ name: "", maxScore: "" }]);

  const addAsana = () => {
    setAsanas([...asanas, { name: "", maxScore: "" }]);
  };

  const handleChange = (index, e) => {
    const updated = [...asanas];
    updated[index][e.target.name] = e.target.value;
    setAsanas(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Scoring Template Saved");
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>📝 Create Scoring Template</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {asanas.map((a, i) => (
          <div key={i} style={styles.asanaRow}>
            <input
              name="name"
              placeholder="Asana Name"
              onChange={(e) => handleChange(i, e)}
              style={styles.input}
            />
            <input
              name="maxScore"
              placeholder="Max Score"
              onChange={(e) => handleChange(i, e)}
              style={styles.input}
            />
          </div>
        ))}

        <button type="button" onClick={addAsana} style={styles.secondaryBtn}>
          + Add Asana
        </button>

        <button type="submit" style={styles.button}>
          Save Template
        </button>
      </form>
    </div>
  );
};

const styles = {
  ...basicAdminStyles,
  asanaRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },
  secondaryBtn: {
    marginBottom: "20px",
    padding: "10px",
    borderRadius: "8px",
    background: "#ddd",
    border: "none",
    cursor: "pointer",
  },
};

export default ScoringTemplateForm;
