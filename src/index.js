import React from "react";
import ReactDOM from "react-dom/client"; // Import createRoot from react-dom/client
import App from "./App";


// Create a root element using the new createRoot API
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the app with Strict Mode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
