import React, { useState } from "react";

const AgeGroupForm = () => {
  const [group, setGroup] = useState({ name: "", minAge: "", maxAge: "" });

  const handleChange = (e) =>
    setGroup({ ...group, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Age Group Saved");
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>👶 Add Age Group</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label>Group Name</label>
        <input name="name" onChange={handleChange} style={styles.input} />

        <label>Min Age</label>
        <input type="number" name="minAge" onChange={handleChange} style={styles.input} />

        <label>Max Age</label>
        <input type="number" name="maxAge" onChange={handleChange} style={styles.input} />

        <button style={styles.button}>Save Age Group</button>
      </form>
    </div>
  );
};

const styles = basicAdminStyles;

export default AgeGroupForm;
